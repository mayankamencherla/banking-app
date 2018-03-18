/**
 * This file contains helper methods for account controller
 */

require('dotenv').config();

 // In-house files
const {User}                         = require('@models/User');
const {Transactions}                 = require('@models/Transactions');
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');
const {errorcodes}                   = require('@errorcodes');
const {getErrorJson}                 = require('@ApiError');

// 3rd party libraries
const _                              = require('lodash');
const envalid                        = require('envalid');
const {AuthAPIClient, DataAPIClient} = require('truelayer-client');
const redis                          = require("redis");
const Promise                        = require('bluebird');

// Cleaning the environment variables,
const env = envalid.cleanEnv(process.env, {
    CLIENT_ID     : envalid.str(),
    CLIENT_SECRET : envalid.str(),
    MOCK          : envalid.bool(),
    NODE_ENV      : envalid.str(),
    REDIRECT_URI  : envalid.url({default: "http://localhost:3000/callback"})
});

let client;

// Create a redis client
if (process.env.NODE_ENV === 'production') {
    client = Promise.promisifyAll(redis.createClient(6379, 'redis'));
} else {
    client = Promise.promisifyAll(redis.createClient(6379, '127.0.0.1'));
}

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

        let refreshedToken;

        try {

            refreshedToken = await authClient.refreshAccessToken(token.refresh_token);

            logger.info({
                code: tracecodes.ACCESS_TOKEN_RENEWAL_SUCCESS,
                url: req.originalUrl,
            });
        } catch (e) {

            logger.error({
                code: tracecodes.ACCESS_TOKEN_RENEWAL_FAILURE,
                url: req.originalUrl,
            });

            res.status(502).json(
                getErrorJson(
                    502,
                    errorcodes.SERVER_ERROR_TOKEN_REFRESH_FAILURE
                )
            );

            return;
        };

        try {

            // we replace the old token with the new token
            const generatedToken = await User.updateAuthToken(req.user_id, refreshedToken.access_token, refreshedToken.refresh_token);

            logger.info({
                code: tracecodes.APP_AUTH_TOKEN_GENERATED,
                app_token: generatedToken.app_token,
            });

            req.token = generatedToken;

            return;
        } catch (e) {

            logger.error({
                code: tracecodes.UPDATE_USER_ACCESS_TOKEN_FAILURE,
                url: req.originalUrl,
                error: e
            });

            if (res.headersSent === false) {

                res.status(500).json(
                    getErrorJson(
                        500,
                        errorcodes.SERVER_ERROR_TOKEN_REFRESH_FAILURE
                    )
                );
            }
        }
    }
};

/**
 * Makes a request to Truelayer to get all accounts linked to user.
 *
 * @see http://docs.truelayer.com/#list-all-accounts
 *
 * @return {accountIds} [User's account ids]
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

        returnApiFailure(
            req,
            res,
            Error,
            errorcodes.SERVER_ERROR_ACCOUNTS_FETCH_FAILURE
        );
    }
};

/**
 * An async wrapper over Truelayer's getTransactions SDK method
 *
 * @see http://docs.truelayer.com/#retrieve-account-transactions
 *
 * @return {transactions} [User transactions]
 */
const getTransactionsResponse = async (req, res) => {

    // Return early if a token validation failure happened earlier in the flow
    if (res.headersSent !== false) {

        return;
    }

    var token = req.token;

    try {

        const transactions = await Promise.all(getMultipleAccountsTransactions(req, res));

        logger.info({
            code: tracecodes.CUSTOMER_TRANSACTIONS_RESPONSE,
            url: req.originalUrl,
            transactions: transactions,
            app_token: token.app_token,
        });

        //
        // Caching transactions in redis for 1 day
        // We do this so that this data can be quickly accessed
        // in case there is a need to compute some information about it
        //
        saveTransactionToRedis(transactions, req.user_id);

        // If no errors occurred in the flow above, we can return
        // token as a header as the transactions were saved in the DB
        if (res.headersSent === false) {

            res.setHeader('x-auth', token.app_token);

            return transactions;
        }
    } catch (Error) {

        returnApiFailure(
            req,
            res,
            Error,
            errorcodes.SERVER_ERROR_TRANSATIONS_FETCH_FAILURE
        );
    }
};

/**
 * This method takes in an array of accountIds,
 * and makes requests to the Truelayer server to fetch
 * each accounts transactions asynchronously.
 *
 * @see https://goo.gl/FQthFw
 *
 * @return {array} [An array of promises]
 */
const getMultipleAccountsTransactions = async (req, res) => {

    var token = req.token;

    const accounts = req.accounts;

    // Returns an array of promises for each account of the user
    return accounts.map((account) => {

        var accountId = account.account_id;

        return DataAPIClient.getTransactions(token.access_token, accountId)
            .then((transactions) => {

                logger.info({
                    code: tracecodes.ACCOUNT_TRANSACTIONS_RESPONSE,
                    url: req.originalUrl,
                    transactions: transactions,
                    app_token: token.app_token,
                    account_id: accountId,
                });

                // We save account transactions one account at a time
                saveAccountTransactions(req, transactions.results, accountId);

                return {
                    account_id: accountId,
                    count: transactions.results.length,
                    transactions: transactions.results,
                };
            })
            .catch((e) => {

                logger.info({
                    code: tracecodes.TRANSACTIONS_FETCH_FAILED,
                    url: req.originalUrl,
                    app_token: token.app_token,
                    error: e
                });

                return {
                    account_id: accountId,
                    count: 0,
                    transactions: [],
                };
            });
    });
};

/**
 * Saves transactions to redis for 1 day
 * @param  {Object} transactions
 * @param  {string} userId
 */
const saveTransactionToRedis = (transactions, userId) => {

    var accountTransactions = transactions.reduce((acc, accountTxns) => {

        var txns = accountTxns.transactions;

        return acc.concat(txns);
    },
    []);

    client.set(`${userId}_transactions`,
                JSON.stringify(accountTransactions),
                'EX',
                86400);
};

/**
 * We must save the fetched transactions to the DB.
 * We are doing this asynchronously so that API response time is reduced.
 */
const saveAccountTransactions = (req, transactions, accountId) => {

    Transactions.saveTransactions(transactions, accountId, req.user_id)
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
        });
};

/**
 * Get the user transactions from redis or the DB
 *
 * @return {transactions} [User transactions]
 */
const getUserTransactions = async (userId) => {

    try {
        var transactions = await client.getAsync(`${userId}_transactions`);

        //
        // If the data is present in Redis, we return it.
        // If not, we fetch it from the DB.
        //
        if (transactions !== null) {

            logger.info({
                code: tracecodes.FETCHED_TRANSACTIONS_FROM_REDIS,
                transactions: JSON.parse(transactions),
            });

            return JSON.parse(transactions);
        }

        var transactions = await Transactions.fetchByUserId(userId);

        logger.info({
            code: tracecodes.FETCHED_TRANSACTIONS_FROM_DB,
            transactions: transactions
        });

        return transactions;

    } catch (Error) {

        // We weren't able to fetch from redis or from the DB
        return;
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

    res.status(400).json(
        getErrorJson(
            400,
            errorcodes.BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY
        )
    );
};

/**
 * Computes the {min, max, ave} values for each transaction category
 * The code is built on the API contract of Truelayer's transactions.
 *
 * @see http://docs.truelayer.com/#retrieve-account-transactions
 *
 * @return {statistics} [User transaction stats]
 */
const getTxnCategoryStats = (req, transactions) => {

    // All the amounts are in GBP
    const groupedTransactions = _.groupBy(transactions, tran => tran.transaction_category);

    // We are transforming the grouped transactions above
    var responseObj = _.transform(groupedTransactions, (result, value, key) => {

        // We compute stats for each transaction category
        var getMinMaxAve = (value) => {

            var minMaxTotal = value.reduce((acc, val) => {

                var amount = Math.abs(val.amount);

                return [
                    Math.min(amount, acc[0]),
                    Math.max(amount, acc[1]),
                    amount + acc[2]
                ];
            },
            // Min, Max, Total
            [Number.MAX_VALUE, 0, 0]);

            return {
                min: minMaxTotal[0],
                max: minMaxTotal[1],
                average: minMaxTotal[2] / value.length,
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
const returnApiFailure = (req, res, error, errorCode) => {

    var dataToLog = {
        code: tracecodes.CUSTOMER_ACCOUNT_API_CALL_ERROR,
        url: req.originalUrl,
        params: req.params,
        error: error.message
    };

    logger.info(dataToLog);

    // If a response is already sent to the user, we don't resend the response
    if (res.headersSent === false) {

        res.status(400).json(
            getErrorJson(
                400,
                errorCode
            )
        );
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
