require('dotenv').config();

const knex              = require('knex')(require('./../../knexfile'));
const {encrypt}         = require('@utils/crypto');

const jwt               = require('jsonwebtoken');
const envalid           = require('envalid');
const redis             = require("redis");
const uuidv1            = require('uuid/v1');

// Create a redis client
const client = redis.createClient();

// Generate object ID's for the 3 user objects to be seeded into the DB
const userOneId   = 1111111111;
const userTwoId   = uuidv1();

// Ensuring that access token and refresh token is set in the env file
const env = envalid.cleanEnv(process.env, {
    ACCESS_TOKEN : envalid.str(),
    REFRESH_TOKEN: envalid.str()
});

const users = [{
    id: userOneId,
    app_token: jwt.sign({id: userOneId, access: 'auth'}, process.env.JWT_SECRET).toString(),
    truelayer_access_token: encrypt(process.env.ACCESS_TOKEN),
    truelayer_refresh_token: encrypt(process.env.REFRESH_TOKEN)
}, {
    id: userTwoId,
    app_token: jwt.sign({id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString(),
    truelayer_access_token: encrypt("random_access_token_that_will_fail_renewal"),
    truelayer_refresh_token: encrypt("random_refresh_token_that_will_fail_renewal")
}];

const populateUsers = async (done) => {
    // Remove all user seed and insert new

    // Is this not removing all the entries
    await knex('user').del().then(async () => {

        await knex.batchInsert('user', users, 1000)
            .then(() => {

                return Promise.resolve(users);
            });
    });

    const rows = require('./../json/transactions-redis.json');

    client.flushdb((err, succeeded) => {
        console.log(succeeded);
    });

    // TODO: This is not working like it should
    client.set(`${users[0].id}_transactions`,
                JSON.stringify(rows),
                'EX',
                86400);
};

// To be used to insert into the db
var transactions = require('./../json/transactions-db.json');

// Not working like it should
const populateTransactions = async (done) => {

    await knex('transactions').del().then(async () => {

        await knex.batchInsert('transactions', transactions, 1000)
            .then(() => {

                return Promise.resolve(transactions);
            });
    });
};

module.exports = {
    users,
    populateUsers,
    populateTransactions
};
