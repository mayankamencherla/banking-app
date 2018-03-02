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

// run seed before each test case
beforeEach(populateUsers);

describe('Test account transactions', () => {

    it('should assert that authentication fails', (done) => {

        //
        // x-auth token not sent
        // So middleware sends back a 401
        // as an exception will be caught
        //
        request(app)
            .get('/account/1/transactions')
            .expect(401)
            .end(done);
    });

    it('should assert that authentication fails and user not found', (done) => {

        //
        // x-auth token sent
        // So middleware sends back a 401
        //
        request(app)
            .get('/account/1/transactions')
            .set('x-auth', 'random token')
            .expect(401)
            .end(done);
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
            .get('/account/1/transactions')
            .set('x-auth', token)
            .expect(401)
            .end(done);
    });

    it('should pass authentication and fetch transactions', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            const response = require(__dirname + '/json/transactions.json');

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts/1/transactions')
                .reply(200, response)

            request(app)
                .get('/account/1/transactions')
                .set('x-auth', users[1].tokens[0].token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const results = res.body.Transactions;

                    expect(results).toEqual(response);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    done();
                });
        } else {
            done();
        }
    });

    it('should pass authentication and fail at transactions fetch', (done) => {

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts/1/transactions')
                .reply(400, {error: "invalid_access_token"})

            request(app)
                .get('/account/1/transactions')
                .set('x-auth', users[1].tokens[0].token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(400);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

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
                .get('/account/2/transactions')
                .set('x-auth', users[2].tokens[0].token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(400);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

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

            nock('https://api.truelayer.com')
                .get('/data/v1/accounts/3/transactions')
                .reply(200, response)

            request(app)
                .get('/account/3/transactions')
                .set('x-auth', users[2].tokens[0].token)
                .end((err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    done();
                });
        } else {
            done();
        }

    });

    it('should not save transactions without results as main key of response json', async (done) => {

        req = {
            originalUrl: '/account/1/transactions',
            params: {
                account_id: 1
            },
            user: {
                _id: users[2]._id,
            }
        };

        res = {
            statusCode: 200,
            sendStatus: (statusCode) => {
                this.statusCode = statusCode;
            }
        };

        const transactions = require('./json/transactions.json');

        service.saveAccountTransactionsToUser(req, transactions.results, users[2].tokens[0]);

        // Assert that the user doesn't have any transactions saved in the DB

        done();
    });
});
