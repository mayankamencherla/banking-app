const {User}         = require('@models/User');
const {logger}       = require('@log/logger');
const {tracecodes}   = require('@tracecodes');


// This method redirects to the truelayer authentication url
const authenticate = (req, res, next) => {

    const token = req.header('x-auth');

    logger.info({
        code: tracecodes.AUTHENTICATION_VIA_MIDDLEWARE,
        app_token: token,
        url: req.originalUrl
    });

    // Finds the user by token
    User.findByToken(token).then((user) => {
        if (!user){

            // TODO: What if old token is sent? How do we handle the flow?
            logger.error({
                code: tracecodes.USER_NOT_FOUND,
                app_token: token,
                url: req.originalUrl
            });

            return Promise.reject();
        }

        // we attach the user object to the request
        req.user = user;

        logger.info({
            code: tracecodes.AUTHENTICATED_USER_FOUND,
            app_token: token,
        });

        next();
    }).catch((e) => {
        res.sendStatus(401).send('Unable to authenticate user'); // unauthorized
    });
};

module.exports = {authenticate};
