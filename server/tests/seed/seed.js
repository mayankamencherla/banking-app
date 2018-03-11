require('dotenv').config();

const knex              = require('knex')(require('./../../knexfile'));
const {encrypt}         = require('@utils/crypto');

const jwt               = require('jsonwebtoken');
const envalid           = require('envalid');
const uuidv1            = require('uuid/v1');
const redis             = require("redis");

// Create a redis client
const client = redis.createClient();

// Generate object ID's for the 3 user objects to be seeded into the DB
const userOneId   = uuidv1();
const userTwoId   = uuidv1();
const userThreeId = uuidv1();

// Ensuring that access token and refresh token is set in the env file
const env = envalid.cleanEnv(process.env, {
    ACCESS_TOKEN : envalid.str(),
    REFRESH_TOKEN: envalid.str()
});

const users = [{
    id: userOneId,
    app_token: 'Random fake access token',
}, {
    id: userTwoId,
    app_token: jwt.sign({id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString(),
    truelayer_access_token: encrypt(process.env.ACCESS_TOKEN),
    truelayer_refresh_token: encrypt(process.env.REFRESH_TOKEN)
}, {
    id: userThreeId,
    app_token: jwt.sign({id: userThreeId, access: 'auth'}, process.env.JWT_SECRET).toString(),
    truelayer_access_token: encrypt("random_access_token_that_will_fail_renewal"),
    truelayer_refresh_token: encrypt("random_refresh_token_that_will_fail_renewal")
}];

const populateUsers = async (done) => {
    // Remove all user seed and insert new

    await knex('user').del().then(async () => {

        await knex.batchInsert('user', users, 1000)
            .then(() => {

                return Promise.resolve(users);
            });
    });

    const rows = JSON.stringify(require('./../json/transactions-redis.json'));

    // TODO: Delete redis data before setting it again

    client.set(`${users[1].id}_transactions`,
                JSON.stringify(rows),
                'EX',
                86400);
};

module.exports = {
    users,
    populateUsers
};
