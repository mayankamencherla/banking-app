const {User} = require('./../models/User');


// This method redirects to the truelayer authentication url
const authenticate = (req, res, next) => {

    const token = req.header('x-auth');

    // Finds the user by token
    User.findByToken(token).then((user) => {
        if (!user){
            console.log('Not able to find the user');
            return Promise.reject();
        }

        // we attach the user object to the request
        req.user = user;

        next();
    }).catch((e) => {
        res.sendStatus(401).send('Unable to authenticate user'); // unauthorized
    });
};

module.exports = {authenticate};
