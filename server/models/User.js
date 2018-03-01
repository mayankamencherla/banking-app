const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

const mongoose                       = require('mongoose');
const jwt                            = require('jsonwebtoken');

/*----------------------------------------------------------------*/

const UserSchema = new mongoose.Schema({
    // email: {
    //     type: String,
    //     required: true
    //     // validate the email
    // },
    tokens: [{
        access: {
            type: String,
            required: true,
        },
        token: {
            type: String,
            required: true,
        },
        // truelayer tokens
        access_token: {
            type: String,
            required: true,
        },
        refresh_token: {
            type: String,
            required: true, // required because we use offline_access scope
        }
    }],
    // We will dump the transactions into the UserSchema
    transactions: [],
});

// This method is used to push the truelayer access token into the DB
// We return the custom token to the user for re-use.
UserSchema.methods.generateAuthToken = function(access_token, refresh_token) {

    var user = this;

    var access = 'auth'; // we are generating an auth token

    // we get the web token based on the user._id attribute
    var objectToTokenify = {_id: user._id.toHexString(), access};

    var token = jwt.sign(objectToTokenify, process.env.JWT_SECRET).toString();

    logger.info({
        code: tracecodes.AUTH_TOKEN_GENERATION_REQUEST,
        app_token: token,
    });

    // Reset the tokens array each time
    user.tokens = [];

    user.tokens.push({access, token, access_token, refresh_token});

    return user.save().then(() => {
        return token;
    });
};

// This method is used to save the transactions into the DB
UserSchema.statics.saveTransactions = function(results, id) {
    var User = this;

    logger.info({
        code: tracecodes.SAVE_TRANSACTIONS_REQUEST,
        transactions: results,
        user_id: id
    });

    // We update the transactions into the user's row in the DB
    return User.update({
                    _id: id
                }, {
                    $set: {
                        transactions: results
                    }
                }).then(() => {
                    return results;
                });
};

// We want to find the user by the custom token
UserSchema.statics.findByToken = function(token) {
    var User = this; // Model method, so this = User model

    logger.info({
        code: tracecodes.FIND_USER_BY_TOKEN_REQUEST,
        app_token: token,
    });

    try {
        // We get the user id based on the web token
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return Promise.reject();
    }

    return User.findOne({
        "_id": decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    });
};

const User = mongoose.model('User', UserSchema);

module.exports = {User};
