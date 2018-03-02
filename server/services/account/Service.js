/**
 * This file contains helper methods for account controller
 */

 // In-house files
const {User}                         = require('@models/User');
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

// 3rd party libraries
const _                              = require('lodash');
const envalid                        = require('envalid');
const {AuthAPIClient, DataAPIClient} = require('truelayer-client');

// Cleaning the environment variables, TODO: Move this out to a different file
const env = envalid.cleanEnv(process.env, {
    CLIENT_ID     : envalid.str(),
    CLIENT_SECRET : envalid.str(),
    MOCK          : envalid.bool(),
    REDIRECT_URI  : envalid.url({default: "http://localhost:3000/callback"})
});

// picks up env variables automatically
const authClient = new AuthAPIClient();

/**
 * We only save 1 valid token at a time
 */
const refreshTokenIfExpired = async (req, res, token) => {

    if (DataAPIClient.validateToken(token.access_token) === false) {

        logger.error({
            code: tracecodes.EXPIRED_ACCESS_TOKEN,
            url: req.originalUrl,
            app_token: token.token,
        });

        // get new access token and replace the existing token
        // What if wrong info passed here? exception handling??
        await authClient.refreshAccessToken(token.refresh_token)
                        .then(async (token) => {

                            logger.info({
                                code: tracecodes.ACCESS_TOKEN_RENEWAL_SUCCESS,
                                url: req.originalUrl,
                            });

                            // we add the token back to the user model
                            await User.updateAuthToken(req.user._id, token.access_token, token.refresh_token)
                                    .then((token) => {

                                        logger.info({
                                            code: tracecodes.APP_AUTH_TOKEN_GENERATED,
                                            app_token: token.token,
                                        });

                                        req.user.tokens[0] = token;

                                        return;
                                    });
                        })
                        .catch((e) => {

                            logger.error({
                                code: tracecodes.ACCESS_TOKEN_RENEWAL_FAILURE,
                                url: req.originalUrl,
                                error: e
                            });

                            // Bad request
                            res.sendStatus(400);
                        });
    }
};

const sendTransactionsResponse = async (req, res, token) => {

    // Return early if a token validation failure happened earlier in the flow
    if (res.headersSent !== false) {

        return;
    }

    try {

        const transactions = await DataAPIClient.getTransactions(token.access_token, req.params.account_id);

        logger.info({
            code: tracecodes.CUSTOMER_TRANSACTIONS_RESPONSE,
            url: req.originalUrl,
            transactions: transactions,
            app_token: token.token,
            account_id: req.params.account_id,
        });

        await saveAccountTransactionsToUser(req, transactions, token);

        res.setHeader('x-auth', token.token);

        return transactions;
    } catch (Error) {

        returnApiFailure(req, res, Error);
    }
};

const saveAccountTransactionsToUser = async (req, transactions, token) => {

    // TODO: Do a dirty check and update only if different
    // TODO: Save this into the transactions DB
    await User.saveTransactions(transactions.results, req.user._id)
        .then((results) => {

            logger.info({
                code: tracecodes.CUSTOMER_TRANSACTIONS_SAVED,
                url: req.originalUrl,
                transactions: results,
                app_token: token.token,
                account_id: req.params.account_id,
            });
        })
        .catch((e) => {

            logger.info({
                code: tracecodes.CUSTOMER_TRANSACTIONS_NOT_SAVED,
                url: req.originalUrl,
                error: e.message,
                app_token: token.token,
                account_id: req.params.account_id,
            });

            res.sendStatus(400);
        });
};

const handleTransactionsEmpty = (req, res, transactions) => {

    // This route was called before saving transactions into the DB
    if (transactions.length === 0) {

        logger.error({
            code: tracecodes.CUSTOMER_TRANSCTIONS_NOT_SAVED,
            url: req.originalUrl,
            account_id: req.params.account_id,
        });

        res.status(400).send('No transactions present for this customer. Make a request to /account/:account_id/tranasctions to get transaction data');
    }
};

const getTxnCategoryStats = (req, transactions) => {

    // All the amounts are in GBP
    const groupedTransactions = _.groupBy(transactions, tran => tran.transaction_category);

    var responseObj = _.transform(groupedTransactions, (result, value, key) => {

        // TODO: Is there a cleaner way to do this?
        var getMinMaxAve = (value) => {
            var min = Number.MAX_VALUE, max = 0, average = 0, total = 0;

            for (var i=0; i<value.length; i++) {
                var amount = Math.abs(value[i].amount);

                total += amount;

                if (amount < min) {
                    min = amount;
                }

                if (amount > max) {
                    max = amount;
                }
            }

            return {
                min: min,
                max: max,
                average: total / value.length,
            };
        };

        var resultToPush = {[key]: getMinMaxAve(value)};

        result.push(resultToPush);

        return result;

    }, []);

    logger.info({
        code: tracecodes.CUSTOMER_ACCOUNT_STATS_RESPONSE,
        url: req.originalUrl,
        account_id: req.params.account_id,
        app_token: req.user.tokens[0].token,
        statistics: responseObj,
    });

    return responseObj;
};

const returnApiFailure = (req, res, error) => {

    var dataToLog = {
        code: tracecodes.CUSTOMER_ACCOUNT_API_CALL_ERROR,
        url: req.originalUrl,
        params: req.params,
        error: error.message
    };

    logger.info(dataToLog);

    // If a response is already sent to the user, we don't resend the response
    if (res.headersSent === false) {

        res.sendStatus(400);
    }
};

module.exports = {
    refreshTokenIfExpired,
    sendTransactionsResponse,
    handleTransactionsEmpty,
    getTxnCategoryStats
};
