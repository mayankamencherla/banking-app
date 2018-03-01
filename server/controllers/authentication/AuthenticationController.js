// In-house files
const service                        = require('@services/authentication/Service');

module.exports.controller = (app) => {

    /**
     * This route is used to make the authentication request to Truelayer
     *
     * @see http://docs.truelayer.com/#customer-authentication
     */
    app.get('/', (req, res) => {

        const authUrl = service.getTruelayerAuthUrl(req);

        res.redirect(authUrl);
    });

    /**
     * This route is used to handle the authentication callback from truelayer
     * The customer's information is rendered onto the screen as a JSON API.
     *
     * @see http://docs.truelayer.com/#code-redirect
     */
    app.get('/callback', async (req, res) => {

        const tokens = await service.getTruelayerAuthToken(req, res);

        // We return early if the token was not generated correctly
        if (service.runTokenValidations(req, res, tokens) === false) {

            return;
        };

        service.createNewAuthenticatedUser(req, res, tokens);

        const info = await service.getAuthenticatedUserInfo(req, res, tokens);

        res.json({"Info": info});
    });

};
