require('dotenv').config();

const jwt                    = require('jsonwebtoken');
const expect                 = require('expect');
const request                = require('supertest');
const nock                   = require('nock');
const {DataAPIClient}        = require('truelayer-client');
const {ObjectID}             = require('mongodb');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const {users, populateUsers} = require('@seed/seed');
const service                = require('@services/account/Service');
const {errorcodes}           = require('@errorcodes');
const {errormessages}        = require('@errormessages');
const knex                   = require('knex')(require('./../knexfile'));

// run seed before each test case
before(() => {
  return new Promise(async (resolve) => {
      await populateUsers();
      resolve();
  });
});

describe('Test account transactions', () => {

    it('should assert that authentication fails', (done) => {

        //
        // x-auth token not sent
        // So middleware sends back a 401
        // as an exception will be caught
        //
        request(app)
            .get('/user/transactions')
            .end((err, res) => {

                expect(res.statusCode).toEqual(401);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                const errorCode = errorcodes.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                const errorMessage = errormessages.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                expect(res.body).toEqual({
                    http_status_code: 401,
                    error: errorCode,
                    error_message: errorMessage
                });

                done();
            });
    });

    it('should assert that authentication fails and user not found', (done) => {

        //
        // x-auth token sent
        // So middleware sends back a 401
        //
        request(app)
            .get('/user/transactions')
            .set('x-auth', 'random token')
            .end((err, res) => {

                expect(res.statusCode).toEqual(401);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                const errorCode = errorcodes.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                const errorMessage = errormessages.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                expect(res.body).toEqual({
                    http_status_code: 401,
                    error: errorCode,
                    error_message: errorMessage
                });

                done();
            });
    });

    it('should assert that user not found with invalid jwt token', (done) => {

        var access = 'auth'; // we are generating an auth token

        var objectToTokenify = {_id: (new ObjectID()).toHexString(), access};

        const token = jwt.sign(objectToTokenify, process.env.JWT_SECRET).toString();

        //
        // x-auth token sent
        // So middleware sends back a 401
        //
        request(app)
            .get('/user/transactions')
            .set('x-auth', token)
            .end((err, res) => {

                expect(res.statusCode).toEqual(401);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                const errorCode = errorcodes.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                const errorMessage = errormessages.BAD_REQUEST_ERROR_AUTHENTICATION_FAILURE;

                expect(res.body).toEqual({
                    http_status_code: 401,
                    error: errorCode,
                    error_message: errorMessage
                });

                done();
            });
    });

    it('should pass authentication and fetch transactions', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            const response = require(__dirname + '/json/transactions.json');

            var accountId = 'f1234560abf9f57287637624def390871';

            const accounts = require(__dirname + '/json/accounts.json');

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts')
                .reply(200, accounts)


            nock('https://api.truelayer.com')
                .get(`/data/v1/accounts/${accountId}/transactions`)
                .reply(200, response)

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[0].app_token)
                .end(async (err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const results = res.body.Transactions;

                    const apiResponse = require(__dirname + '/json/transactions-response.json');

                    expect(results).toEqual(apiResponse);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    const transactions = await knex('transactions')
                                        .where('user_id', users[0].id);

                    expect(transactions.length === 0).toEqual(false);

                    done();
                });
        } else {
            done();
        }
    });

    it('should return transactions when 0 accounts present for user', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            const response = require(__dirname + '/json/transactions.json');

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts')
                .reply(200, {results: []})

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[0].app_token)
                .end(async (err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const results = res.body.Transactions;

                    expect(results).toEqual([]);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    // We still set the x-auth token in this case
                    expect(xAuthSet).toEqual(true);

                    done();
                });
        } else {
            done();
        }
    });

    it('should pass authentication and fail account fetch', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts')
                .reply(400, {error: "invalid_access_token"});

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[0].app_token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(400);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

                    const errorCode = errorcodes.SERVER_ERROR_ACCOUNTS_FETCH_FAILURE;

                    const errorMessage = errormessages.SERVER_ERROR_ACCOUNTS_FETCH_FAILURE;

                    expect(res.body).toEqual({
                        http_status_code: 400,
                        error: errorCode,
                        error_message: errorMessage
                    });

                    done();
                });
        } else {
            done();
        }
    });

    it('should pass authentication and fail at transactions fetch', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            var accountId = 'f1234560abf9f57287637624def390871';

            const accounts = require(__dirname + '/json/accounts.json');

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts')
                .reply(200, accounts)


            nock('https://api.truelayer.com')
                .get(`/data/v1/accounts/${accountId}/transactions`)
                .reply(400, {error: "invalid_access_token"})

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[0].app_token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    // When transaction fetch fails, API returns
                    // an array with accountId and [] for transactions
                    expect(res.body.Transactions).toEqual([{
                        account_id: "f1234560abf9f57287637624def390871",
                        count: 0,
                        transactions: []
                    }]);

                    done();
                });
        } else {
            done();
        }
    });

    it('should fail token validation and fail renewal', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            nock('https://auth.truelayer.com')
                .post('/connect/token')
                .reply(400, {error: "invalid renewal token"});

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[1].app_token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(502);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

                    const errorCode = errorcodes.SERVER_ERROR_TOKEN_REFRESH_FAILURE;

                    const errorMessage = errormessages.SERVER_ERROR_TOKEN_REFRESH_FAILURE;

                    expect(res.body).toEqual({
                        http_status_code: 502,
                        error: errorCode,
                        error_message: errorMessage
                    });

                    done();
                });
        } else {
            done();
        }

    });

    it('should not create a new user', async () => {

        // Not setting user_id in the req
        // This will cause a failure while saving user
        req = {};

        res = {
            headersSent: false,
            statusCode: 200,
            status: function (statusCode) {
                this.statusCode = statusCode;

                return this;
            },
            json: function (body) {
                // Dummy function
                return;
            }
        };

        token = {
            access_token: "random token",
            refresh_token: "refresh token",
        };

        nock('https://auth.truelayer.com')
            .post('/connect/token')
            .reply(200, token);

        await service.refreshTokenIfExpired(req, res, token);

        const users = await knex('user').select();

        // New user was not created
        expect(users.length).toEqual(2);
    });

    it('should not fetch user accounts with expired token', () => {

        // Invalid access token will fail validation
        req.token = {
            access_token: "random token",
            refresh_token: "refresh token",
        };

        service.fetchAllUserAccounts(req, {})
            .then((accounts) => {
                expect(typeof accounts).toEqual('undefined');

                Promise.resolve();
            });
    });

    it('should not fetch transactions with res already sent', () => {

        // Headers already sent will result in an early return
        res = {headersSent: true};

        service.getTransactionsResponse({}, res)
            .then((transactions) => {
                expect(typeof transactions).toEqual('undefined');

                Promise.resolve();
            });
    });

    it('should not save account transactions', async () => {

        // Attempting to insert a new transaction
        const txns = [
            {
              "user_id": "2374673843",
              "account_id": "f1234560abf9f57287637624def390871",
              "transaction_id": "792384792384798",
              "timestamp": "2017-02-01T00:00:00+00:00",
              "description": "INTEREST (GROSS)",
              "transaction_type": "CREDIT",
              "transaction_category": "INTEREST",
              "amount": 0.77,
              "currency": "GBP"
            }
        ];

        var accountId = 'f1234560abf9f57287637624def390871';

        var transactions = await knex('transactions').select();

        var initialLength = transactions.length;

        service.saveAccountTransactions({}, txns, accountId);

        transactions = await knex('transactions').select();

        // Transactions were not saved into the DB
        expect(transactions.length).toEqual(initialLength);
    });

    it('should renew token and return transactions', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            nock('https://auth.truelayer.com')
                .post('/connect/token')
                .reply(200, {
                    access_token: process.env.ACCESS_TOKEN,
                    refresh_token: process.env.REFRESH_TOKEN,
                });

            const response = require(__dirname + '/json/transactions.json');

            var accountId = 'f1234560abf9f57287637624def390871';

            const accounts = require(__dirname + '/json/accounts.json');

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts')
                .reply(200, accounts)


            nock('https://api.truelayer.com')
                .get(`/data/v1/accounts/${accountId}/transactions`)
                .reply(200, response)

            request(app)
                .get('/user/transactions')
                .set('x-auth', users[1].app_token)
                .end(async (err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    const results = res.body.Transactions;

                    const apiResponse = require(__dirname + '/json/transactions-response.json');

                    expect(results).toEqual(apiResponse);

                    const transactions = await knex('transactions')
                                        .where('user_id', users[0].id);

                    expect(transactions.length === 0).toEqual(false);

                    done();
                });
        } else {
            done();
        }

    });
});
