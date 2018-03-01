require('dotenv').config();

// In-house files
const {User}                         = require('./../../models/User');

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
// We are requesting offline_access so that we can use the renewal token
const scopes = ['info', 'accounts', 'balance', 'transactions', 'offline_access'];

module.exports.controller = (app) => {

    /**
     * This route is used to make the authentication request to Truelayer
     */
    app.get('/', (req, res) => {

        const authUrl = authClient.getAuthUrl(env.REDIRECT_URI, scopes, "foobar", "", "", process.env.MOCK);

        res.redirect(authUrl);
    });

    /**
     * This route is used to handle the default authentication / authorization step
     * where the customer's identity information is rendered onto the screen as a JSON
     * Truelayer's authorization step happens via a callback url
     * @see Add  link here
     */
    app.get('/callback', async (req, res) => {

        const code = req.query.code;

        // We get Truelayer's access token after authorization step via OAuth2.0
        const tokens = await authClient.exchangeCodeForToken(env.REDIRECT_URI, code);

        // We create the user and add it into the DB
        const user = new User();

        user.save().then(() => {
            return user.generateAuthToken(tokens.access_token, tokens.refresh_token);
        }).then((token) => {
            console.log(`Saved the user with the token: ${token}`);
            res.setHeader('x-auth', token);
        }).catch((e) => {
            res.sendStatus(400);
        });

        // Hit the info endpoint and get indentity of the customer once authentication is complete
        // and the user has authorized the app to use his banking data on the app
        const info = await DataAPIClient.getInfo(tokens.access_token);

        res.json({"Info": info});
    });

};
