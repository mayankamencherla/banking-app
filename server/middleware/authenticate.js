const {User}        = require('@models/User');
const {logger}      = require('@log/logger');
const {tracecodes}  = require('@tracecodes');
const {decrypt}     = require('@utils/crypto');


// This method redirects to the truelayer authentication url
const authenticate = (req, res, next) => {

    //
    // If token is not set in the header, it will be undefined,
    // In this case, it won't be logged below and an exception will raised later
    //
    var token = req.header('x-auth');

    if (typeof token === 'undefined') {

        logger.error({
            code: tracecodes.APP_TOKEN_NOT_SENT_IN_HEADER,
            url: req.originalUrl
        });

        res.sendStatus(401);

        return;
    }

    logger.info({
        code: tracecodes.AUTHENTICATION_VIA_MIDDLEWARE,
        app_token: token,
        url: req.originalUrl
    });

    // Finds the user by token
    User.findByToken(token).then((user) => {

        if (!user){
            // TODO: What if old token is sent? How do we handle the flow?
            return Promise.reject();
        }

        logger.info({
            code: tracecodes.AUTHENTICATED_USER_FOUND,
            app_token: token,
        });

        // We must decrypt the access and refresh tokens

        token = {
            app_token: user.app_token,
            access_token: decrypt(user.truelayer_access_token),
            refresh_token: decrypt(user.truelayer_refresh_token),
        };

        // we attach the user object to the request
        req.token = token;

        req.user_id = user.id;

        next();
    }).catch((e) => {

        logger.error({
            code: tracecodes.USER_NOT_FOUND,
            app_token: token,
            url: req.originalUrl,
        });

        res.sendStatus(401); // unauthorized
    });
};

module.exports = {authenticate};
