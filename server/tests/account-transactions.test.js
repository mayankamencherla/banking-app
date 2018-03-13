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
