/**
 * This class contains the error codes used throughout the application
 */

/**
 * [Application internal error codes]
 * @type {Object}
 */
const errorcodes = {
    // External Server Errors
    SERVER_ERROR_TRUELAYER_CALLBACK_ERROR    : 'SERVER_ERROR_TRUELAYER_CALLBACK_ERROR',
    SERVER_ERROR_TOKEN_EXCHANGE_FAILURE      : 'SERVER_ERROR_TOKEN_EXCHANGE_FAILURE',
    SERVER_ERROR_INVALID_TOKEN               : 'SERVER_ERROR_INVALID_TOKEN',
    SERVER_ERROR_CUSTOMER_INFO_FETCH_FAILED  : 'SERVER_ERROR_CUSTOMER_INFO_FETCH_FAILED',
    SERVER_ERROR_TOKEN_REFRESH_FAILURE       : 'SERVER_ERROR_TOKEN_REFRESH_FAILURE',
    SERVER_ERROR_ACCOUNTS_FETCH_FAILURE      : 'SERVER_ERROR_ACCOUNTS_FETCH_FAILURE',
    SERVER_ERROR_TRANSATIONS_FETCH_FAILURE   : 'SERVER_ERROR_TRANSATIONS_FETCH_FAILURE',

    // Internal Server Errors
    API_ERROR_USER_GENERATION_FAILED         : 'API_ERROR_USER_GENERATION_FAILED',
    API_ERROR_TOKEN_UPDATE_FAILED            : 'API_ERROR_TOKEN_UPDATE_FAILED',

    // Bad Request Errors
    BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY     : 'BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY',
    BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE : 'BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE',
};

module.exports = {errorcodes};
