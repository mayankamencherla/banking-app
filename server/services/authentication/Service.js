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

const getTruelayerAuthToken = async (req, res) => {

    var dataToLog = {
        code: tracecodes.AUTH_CALLBACK_REQUEST,
        url: req.originalUrl,
        query: req.query,
    };

    // When user does not authorize the app, error is sent as a query param
    if ((req.query.hasOwnProperty('error') === true) ||
        (validator.isAlphanumeric(req.query.code) === false)) {

        returnCallbackFailure(req, res, tracecodes.AUTH_CALLBACK_ERROR);

        return;
    }

    logger.info(dataToLog);

    const code = req.query.code;

    try {

        // We get Truelayer's access token after authorization step via OAuth2.0
        const tokens = await authClient.exchangeCodeForToken(env.REDIRECT_URI, code);

        return tokens;
    } catch (Error) {

        returnCallbackFailure(req, res, tracecodes.ERROR_EXCHANGING_CODE_FOR_TOKEN);

        return;
    }
};

/**
 * We create a new authenticated user in our app
 * only after token validations have passed before this step
 */
const createNewAuthenticatedUser = (req, res, tokens) => {

    // We create the user and add it into the DB
    const user = new User();

    user.save().then(() => {

        return user.generateAuthToken(tokens.access_token, tokens.refresh_token);
    }).then((token) => {

        logger.info({
            code: tracecodes.APP_AUTH_TOKEN_GENERATED,
            app_token: token.token,
        });

        //
        // We add a sanity check here to ensure that if this callback
        // is processed after a response is already sent, we should
        // not re-set headers, as this would lead to an error
        // TODO: This is not the right way to handle things -> better to return in one place
        //
        if (res.headersSent === false) {
            res.setHeader('x-auth', token.token);
        }

    }).catch((e) => {

        logger.error({
            code: tracecodes.APP_AUTH_TOKEN_GENERATION_FAILED,
            error: e
        });

        // If a response is already sent to the user, we don't resend the response
        if (res.headersSent === false) {
            res.sendStatus(400);
        }
    });
};

const getAuthenticatedUserInfo = async (req, res, tokens) => {

    //
    // Hit the info endpoint and get indentity of the customer once authentication is complete
    // and the user has authorized the app to use his banking data on the app
    //
    try {

        const info = await DataAPIClient.getInfo(tokens.access_token);

        logger.info({
            code: tracecodes.AUTHENTICATED_CUSTOMER_INFO,
            customer_info: info,
        });

        return info;
    } catch (Error) {

        returnCallbackFailure(req, res, tracecodes.ERROR_FETCHING_CUSTOMER_INFO);
    }
};

const returnCallbackFailure = (req, res, traceCode) => {

    var dataToLog = {
        code: traceCode,
        url: req.originalUrl,
        query: req.query,
    };

    logger.info(dataToLog);

    // If a response is already sent to the user, we don't resend the response
    if (res.headersSent === false) {
        res.sendStatus(401);
    }
};

const runTokenValidations = (req, res, tokens) => {

    if ((typeof tokens === 'undefined') ||
        (DataAPIClient.validateToken(tokens.access_token) === false)) {

        returnCallbackFailure(req, res, tracecodes.TOKEN_VALIDATION_FAILURE);

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
