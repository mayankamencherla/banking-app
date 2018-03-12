/**
 * This class contains the error codes used throughout the application
 */

const errormessages = {
    // External Server Errors
    SERVER_ERROR_TRUELAYER_CALLBACK_ERROR   : 'There was an error with the callback from Truelayer',
    SERVER_ERROR_TOKEN_EXCHANGE_FAILURE     : 'There was an error while fetching Truelayer access tokens',
    SERVER_ERROR_INVALID_TOKEN              : 'Invalid token being used for API calls to Truelayer',
    SERVER_ERROR_CUSTOMER_INFO_FETCH_FAILED : 'There was an error while fetching customer info from Truelayer',
    SERVER_ERROR_TOKEN_REFRESH_FAILURE      : 'There was an error while refreshing Truelayer access token',
    SERVER_ERROR_ACCOUNTS_FETCH_FAILURE     : 'There was an error while fetching customer accounts information',
    SERVER_ERROR_TRANSATIONS_FETCH_FAILURE  : 'There was an error while fetching customer account transactions',

    // Internal Server Errors
    API_ERROR_USER_GENERATION_FAILED      : 'User was not saved on API. Please try again later',
    API_ERROR_TOKEN_UPDATE_FAILED         : 'Token update failed on API',

    // Bad Request Errors
    BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY  : 'Customer transactions have not yet been saved on API. Please make a request to the /user/transactions route and then retry this request'
};

module.exports = {errormessages};
