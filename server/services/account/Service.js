/**
 * This file contains helper methods for account controller
 */

 // In-house files
const {User}                         = require('@models/User');
const {Transactions}                 = require('@models/Transactions');
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

// 3rd party libraries
const _                              = require('lodash');
const envalid                        = require('envalid');
const {AuthAPIClient, DataAPIClient} = require('truelayer-client');
const redis                          = require("redis");
const Promise                        = require('bluebird');

// Create a redis client
const client = Promise.promisifyAll(redis.createClient());

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
 * If a user makes a request with an expired Truelayer access token,
 * we must exchange the refresh token for a new access token.
 *
 * @see http://docs.truelayer.com/#renew-the-access_token
 */
const refreshTokenIfExpired = async (req, res, token) => {

    if (DataAPIClient.validateToken(token.access_token) === false) {

        logger.error({
            code: tracecodes.EXPIRED_ACCESS_TOKEN,
            url: req.originalUrl,
            app_token: token.app_token,
        });

        try {

            const token = await authClient.refreshAccessToken(token.refresh_token);

            logger.info({
                code: tracecodes.ACCESS_TOKEN_RENEWAL_SUCCESS,
                url: req.originalUrl,
                token: token
            });

            // we replace the old token with the new token
            const generatedToken = await User.updateAuthToken(req.user_id, token.access_token, token.refresh_token);

            logger.info({
                code: tracecodes.APP_AUTH_TOKEN_GENERATED,
                app_token: generatedToken.app_token,
            });

            return generatedToken;

        } catch (e) {

            logger.error({
                code: tracecodes.ACCESS_TOKEN_RENEWAL_FAILURE,
                url: req.originalUrl,
                error: e
            });

            // Bad request
            res.sendStatus(400);
        };
    }

    return req.token;
};

/**
 *
 */
const fetchAllUserAccounts = async (req, res) => {

    if (DataAPIClient.validateToken(req.token.access_token) === false) {

        // We were not able to successfully renew the token
        return;
    }

    try {

        logger.info({
            code: tracecodes.CUSTOMER_ACCOUNTS_REQUEST,
            url: req.originalUrl,
            app_token: req.token.app_token,
        });

        const accounts = await DataAPIClient.getAccounts(req.token.access_token);

        logger.info({
            code: tracecodes.CUSTOMER_ACCOUNTS_RESPONSE,
            url: req.originalUrl,
            accounts: accounts,
            app_token: req.token.app_token,
        });

        // We pick out the account ids that are needed for later usage
        return _.map(accounts.results, _.partialRight(_.pick, 'account_id'));

    } catch (Error) {

        returnApiFailure(req, res, Error);
    }
};

/**
 * An async wrapper over Truelayer's getTransactions SDK method
 *
 * @see http://docs.truelayer.com/#retrieve-account-transactions
 */
const getTransactionsResponse = async (req, res) => {

    // Return early if a token validation failure happened earlier in the flow
    if (res.headersSent !== false) {

        return;
    }

    var token = req.token;

    try {

        for (let i=0; i<req.accounts.length; i++) {

            var accountId = req.accounts[i].account_id;

            var accountTransactions = (await DataAPIClient.getTransactions(token.access_token, accountId)).results;

            logger.info({
                code: tracecodes.ACCOUNT_TRANSACTIONS_RESPONSE,
                url: req.originalUrl,
                transactions: accountTransactions,
                app_token: token.app_token,
                account_id: accountId,
            });

            req.accounts[i].transactions = accountTransactions;

            // We save account transactions one account at a time
            await saveAccountTransactions(req, res, accountTransactions, accountId);
        }

        transactions = req.accounts;

        logger.info({
            code: tracecodes.CUSTOMER_TRANSACTIONS_RESPONSE,
            url: req.originalUrl,
            transactions: transactions,
            app_token: token.app_token,
        });

        // If no errors occurred in the flow above, we can return
        // token as a header as the transactions were saved in the DB
        if (res.headersSent === false) {

            res.setHeader('x-auth', token.app_token);

            return transactions;
        }
    } catch (Error) {

        returnApiFailure(req, res, Error);
    }
};

/**
 * We must save the fetched transactions to the DB
 */
const saveAccountTransactions = async (req, res, transactions, accountId) => {

    // TODO: Do a dirty check and update only if different
    // TODO: Save this into the transactions DB
    await Transactions.saveTransactions(transactions, accountId, req.user_id)
        .then((savedTransactions) => {

            logger.info({
                code: tracecodes.CUSTOMER_TRANSACTIONS_SAVED,
                url: req.originalUrl,
                transactions: savedTransactions,
                app_token: req.token.app_token,
                account_id: accountId,
            });
        })
        .catch((e) => {

            logger.info({
                code: tracecodes.CUSTOMER_TRANSACTIONS_NOT_SAVED,
                url: req.originalUrl,
                error: e,
                app_token: req.token.app_token,
                account_id: accountId
            });

            // TODO: Saving one account's txns shouldn't halt the API???
            if (res.headersSent === false) {
                res.sendStatus(400);
            }
        });
};

/**
 * Get the user transactions from redis or the DB
 */
const getUserTransactions = async (userId) => {

    try {
        const transactions = await client.getAsync(`${userId}_transactions`);

        logger.info({
            code: tracecodes.FETCHED_TRANSACTIONS_FROM_REDIS,
            transactions: JSON.parse(transactions)
        });

        return JSON.parse(transactions);

    } catch (Error) {

        // TODO: Should this be await?
        const transactions = await Transactions.fetchByUserId(userId)

        logger.info({
            code: tracecodes.FETCHED_TRANSACTIONS_FROM_DB,
            transactions: transactions
        });

        // What if no transactions exist in user id
        // TODO: Test this case thoroughly

        return transactions;
    }
};

/**
 * Logs that the transactions response is empty, and sends a 400 to the user
 * This case happens when the user hits the statistics route before fetching
 * all of his transactions from the transactions route.
 */
const handleTransactionsEmpty = (req, res) => {

    logger.error({
        code: tracecodes.CUSTOMER_TRANSACTIONS_NOT_SAVED,
        url: req.originalUrl,
        user_id: req.user_id,
    });

    res.sendStatus(400);
};

/**
 * Computes the {min, max, ave} values for each transaction category
 * The code is built to suit the API spec of Truelayer's transactions.
 *
 * @see http://docs.truelayer.com/#retrieve-account-transactions
 */
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
        user_id: req.user_id,
        app_token: req.token.app_token,
        statistics: responseObj,
    });

    return responseObj;
};

/**
 * This method is used to log api failures and send a 400 to the user
 */
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
    getTransactionsResponse,
    handleTransactionsEmpty,
    getTxnCategoryStats,
    saveAccountTransactions,
    fetchAllUserAccounts,
    getUserTransactions
};
