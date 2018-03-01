require('dotenv').config();

// In-house files
const {User}                         = require('@models/User');
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

const {AuthAPIClient, DataAPIClient} = require('truelayer-client');
const envalid                        = require('envalid');

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

module.exports.controller = (app) => {

    /**
     * This route is used to make the authentication request to Truelayer
     *
     * @see http://docs.truelayer.com/#customer-authentication
     */
    app.get('/', (req, res) => {

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

        res.redirect(authUrl);
    });

    /**
     * This route is used to handle the authentication callback from truelayer
     * The customer's information is rendered onto the screen as a JSON API.
     *
     * @see http://docs.truelayer.com/#code-redirect
     */
    app.get('/callback', async (req, res) => {

        logger.info({
            code: tracecodes.AUTH_CALLBACK_REQUEST,
            url: req.originalUrl,
        });

        const code = req.query.code;

        // We get Truelayer's access token after authorization step via OAuth2.0
        const tokens = await authClient.exchangeCodeForToken(env.REDIRECT_URI, code);

        // We create the user and add it into the DB
        const user = new User();

        user.save().then(() => {
            return user.generateAuthToken(tokens.access_token, tokens.refresh_token);
        }).then((token) => {

            logger.info({
                code: tracecodes.APP_AUTH_TOKEN_GENERATED,
                app_token: token,
            });

            res.setHeader('x-auth', token);
        }).catch((e) => {

            logger.error({
                code: tracecodes.APP_AUTH_TOKEN_GENERATION_FAILED,
                error_message: e.message,
            });

            res.sendStatus(400);
        });

        // Hit the info endpoint and get indentity of the customer once authentication is complete
        // and the user has authorized the app to use his banking data on the app
        const info = await DataAPIClient.getInfo(tokens.access_token);

        logger.info({
            code: tracecodes.AUTHENTICATED_CUSTOMER_INFO,
            customer_info: info,
        });

        res.json({"Info": info});
    });

};
