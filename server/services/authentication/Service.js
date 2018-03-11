/**
 * This file contains helper methods for authentication controller
 */

require('dotenv').config();

// In-house files
const {User}                         = require('@models/User');
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

const {AuthAPIClient, DataAPIClient} = require('truelayer-client');
const envalid                        = require('envalid');
const validator                      = require('validator');

// Cleaning the environment variables, TODO: Move this out to a different file
const env = envalid.cleanEnv(process.env, {
    CLIENT_ID     : envalid.str(),
    CLIENT_SECRET : envalid.str(),
    MOCK          : envalid.bool(),
    REDIRECT_URI  : envalid.url({default: "http://localhost:3000/callback"})
});

// picks up env variables automatically
const authClient = new AuthAPIClient();

// array of scopes
// @see http://docs.truelayer.com/#permissions
const scopes = ['info', 'accounts', 'transactions', 'offline_access'];

/**
 * A wrapper over Truelayer's getAuthUrl method in the SDK
 */
const getTruelayerAuthUrl = (req) => {

    logger.info({
        code: tracecodes.AUTHENTICATION_REQUEST,
        url: req.originalUrl,
        headers: req.headers
    });

    const authUrl = authClient.getAuthUrl(env.REDIRECT_URI, scopes, "foobar", "", "", process.env.MOCK);

    logger.info({
        code: tracecodes.TRUELAYER_AUTH_URL,
        authUrl: authUrl,
        redirect_uri: env.REDIRECT_URI,
        mock: process.env.MOCK
    });

    return authUrl;
};

/**
 * The callback url gets a code as one of the GET parameters,
 * which must be used in exchange for Truelayer's access token
 *
 * @see http://docs.truelayer.com/#exchange-code-with-access_token
 */
const getTruelayerAuthToken = async (req, res) => {

    var dataToLog = {
        code: tracecodes.AUTH_CALLBACK_REQUEST,
        url: req.originalUrl,
        query: req.query,
    };

    // When user does not authorize the app, error is sent as a query param
    if ((req.query.hasOwnProperty('error') === true) ||
        (validator.isAlphanumeric(req.query.code) === false)) {

        // This happens when the user doesn't accept authorization
        returnCallbackFailure(req, res, tracecodes.AUTH_CALLBACK_ERROR, 401);

        return;
    }

    logger.info(dataToLog);

    const code = req.query.code;

    try {

        // We get Truelayer's access token after authorization step via OAuth2.0
        return await authClient.exchangeCodeForToken(env.REDIRECT_URI, code);
    } catch (Error) {

        // The code parameter wasn't correct, or the token exchange didn't go through
        returnCallbackFailure(req, res, tracecodes.ERROR_EXCHANGING_CODE_FOR_TOKEN, 502);

        return;
    }
};

/**
 * We create a new authenticated user in our app
 * only after token validations have passed before this step
 */
const createNewAuthenticatedUser = async (req, res, tokens) => {

    // We create the user and add it into the DB
    // TODO: No callback here, we must use this differently
    return User.createUser(tokens.access_token, tokens.refresh_token)
        .then((token) => {

        logger.info({
            code: tracecodes.APP_AUTH_TOKEN_GENERATED,
            app_token: token.app_token,
        });

        //
        // We add a sanity check here to ensure that if this callback
        // is processed after a response is already sent, we should
        // not re-set headers, as this would lead to an error
        //
        if (res.headersSent === false) {

            res.setHeader('x-auth', token.app_token);
        }

    }).catch((e) => {

        logger.error({
            code: tracecodes.APP_AUTH_TOKEN_GENERATION_FAILED,
            error: e
        });

        //
        if (res.headersSent === false) {

            res.sendStatus(500);
        }
    });
};

/**
 * This method is used to get the authenticated user information from Truelayer
 *
 * @see http://docs.truelayer.com/#retrieve-identity-information
 */
const getAuthenticatedUserInfo = async (req, res, tokens) => {

    // If the user creation flow broke at an earlier point, we want to return early
    if (res.headersSent === true) {

        return;
    }


    //
    // Hit the info endpoint and get indentity of the customer once authentication is complete
    // and the user has authorized the app to use his banking data on the app
    //
    try {

        logger.info({
            code: tracecodes.FETCHING_CUSTOMER_INFO,
            app_token: tokens.token,
            url: req.originalUrl
        });

        const info = await DataAPIClient.getInfo(tokens.access_token);

        logger.info({
            code: tracecodes.AUTHENTICATED_CUSTOMER_INFO,
            customer_info: info,
        });

        return info;

    } catch (Error) {

        //
        // Likely error is invalid token, as we expect that
        // the Truelayer service is up and running
        //
        returnCallbackFailure(req, res, tracecodes.ERROR_FETCHING_CUSTOMER_INFO, 401);
    }
};

/**
 * Helper method used to failures in the callback route
 */
const returnCallbackFailure = (req, res, traceCode, httpCode) => {

    var dataToLog = {
        code: traceCode,
        url: req.originalUrl,
        query: req.query,
    };

    logger.info(dataToLog);

    // If a response is already sent to the user, we don't resend the response
    if (res.headersSent === false) {

        res.sendStatus(httpCode);
    }
};

/**
 * A wrapper over Truelayer's validate token method.
 * Access tokens expire every 1 hour, by default.
 *
 * @see http://docs.truelayer.com/#exchange-code-with-access_token
 */
const runTokenValidations = (req, res, tokens) => {

    if ((typeof tokens === 'undefined') ||
        (DataAPIClient.validateToken(tokens.access_token) === false)) {

        // Bad Gateway, as we get the tokens from Truelayer
        returnCallbackFailure(req, res, tracecodes.TOKEN_VALIDATION_FAILURE, 502);

        return false;
    }

    return true;
};

module.exports = {
    getTruelayerAuthUrl,
    getTruelayerAuthToken,
    createNewAuthenticatedUser,
    getAuthenticatedUserInfo,
    runTokenValidations
};
