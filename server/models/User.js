const knex                           = require('knex')(require('./../knexfile'));
const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');
const {encrypt}                      = require('@utils/crypto');
const jwt                            = require('jsonwebtoken');
const uuidv1                         = require('uuid/v1');

/**
 * @param  {string} access_token
 * @param  {string} refresh_token
 * @return {Object} app_token
 */
const createUser  = (access_token, refresh_token) => {

    var access = 'auth'; // we are generating an auth token

    const id = uuidv1();

    // we get the web token based on the id attribute
    var objectToTokenify = {id, access};

    var token = jwt.sign(objectToTokenify, process.env.JWT_SECRET).toString();

    logger.info({
        code: tracecodes.USER_CREATE_REQUEST,
        app_token: token,
    });

    // TODO: Store access token in the redis caching layer
    return knex('user')
            .insert({
                id: id,
                app_token: token,
                truelayer_access_token: encrypt(access_token),
                truelayer_refresh_token: encrypt(refresh_token),
            })
            .then(() => {

                return Promise.resolve({app_token: token});
            });
};

/**
 * @param  {string} id
 * @param  {string} access_token
 * @param  {string} refresh_token
 * @return {Object} app_token, access_token
 */
const updateAuthToken = async (id, access_token, refresh_token) => {

    // we get the web token based on the id attribute
    var objectToTokenify = {id: id, access: 'auth'};

    var token = jwt.sign(objectToTokenify, process.env.JWT_SECRET).toString();

    logger.info({
        code: tracecodes.AUTH_TOKEN_UPDATE_REQUEST,
        app_token: token,
    });

    var dataToUpdate = {
        app_token: token,
        truelayer_access_token: encrypt(access_token),
        truelayer_refresh_token: encrypt(refresh_token),
    };

    // Update the row corresponding to the ID
    return knex('user')
        .where('id', id)
        .update(dataToUpdate)
        .then(() => {

            return Promise.resolve({
                app_token: token,
                access_token: access_token,
            });
        });
};

/**
 * Finds user by app_token for app authentication
 * @param  {string} token
 * @return {user|null} [The found user]
 */
const findByToken = (token) => {

    logger.info({
        code: tracecodes.FIND_USER_BY_TOKEN_REQUEST,
        app_token: token
    });

    try {
        // We get the user id based on the web token
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return Promise.reject();
    }

    // Select based on the token and the decoded id
    return knex('user')
        .where({
            id: decoded.id,
            app_token: token
        })
        .first();
};

module.exports.User = {
    createUser,
    updateAuthToken,
    findByToken
};
