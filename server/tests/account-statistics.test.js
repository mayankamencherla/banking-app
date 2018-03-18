require('dotenv').config();

const jwt                    = require('jsonwebtoken');
const expect                 = require('expect');
const request                = require('supertest');
const {DataAPIClient}        = require('truelayer-client');
const knex                   = require('knex')(require('./../knexfile'));
const redis                  = require("redis");
const Promise                = require('bluebird');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const {errorcodes}           = require('@errorcodes');
const {errormessages}        = require('@errormessages');
const {Transactions}         = require('@models/Transactions');
const service                = require('@services/account/Service');

// Create a redis client
const client = Promise.promisifyAll(redis.createClient());

const {users, populateUsers, populateTransactions} = require('@seed/seed');

// Seed the DB
before(() => {
  return new Promise(async (resolve) => {
      await populateUsers();
      await populateTransactions();
      resolve();
  });
});

describe('Test account transaction statistics route', () => {

    it('should assert that authentication fails', (done) => {

        //
        // x-auth token not sent
        // So middleware sends back a 401
        // as an exception will be caught
        //
        request(app)
            .get('/user/transactions/stats')
            .expect(401)
            .end(done);
    });

    it('should pass authentication and fetch account statistics', (done) => {

        const response = require(__dirname + '/json/statistics.json');

        request(app)
            .get('/user/transactions/stats')
            .set('x-auth', users[0].app_token)
            .end(async (err, res) => {

                expect(res.statusCode).toEqual(200);

                const results = res.body.Statistics;

                expect(results).toEqual(response);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(true);

                // Authenticated token has not expired and will be sent back in the response
                expect(res.header['x-auth']).toEqual(users[0].app_token);

                // Assert that we fetched the data from redis
                const transactions = await client.getAsync(`${users[0].id}_transactions`);

                expect(JSON.parse(transactions).length).toEqual(6);

                done();
            });
    });

    it('should pass authentication and return 400 as user has no transactions', (done) => {

        request(app)
            .get('/user/transactions/stats')
            .set('x-auth', users[1].app_token)
            .end(async (err, res) => {

                expect(res.statusCode).toEqual(400);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                const errorCode = errorcodes.BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY;

                const errorMessage = errormessages.BAD_REQUEST_ERROR_TRANSACTIONS_EMPTY;

                expect(res.body).toEqual({
                    http_status_code: 400,
                    error: errorCode,
                    error_message: errorMessage
                });

                // User1 has 0 transactions
                const transactions = await knex('transactions')
                                        .where('user_id', users[1].id);

                expect(transactions.length).toEqual(0);

                done();
            });
    });

    it('should generate statistics after fetching transactions from db', (done) => {

        const transactions = require('./json/transactions-user1.json');

        const response = require(__dirname + '/json/statistics.json');

        const accountId = 'd1c5057c1dfc149061455dae56a7a535';

        //
        // User1 doesn't have any transactions stored in redis,
        // so I'm inserting transactions into the DB, which will
        // get pulled out later while generating transactions stat
        //
        Transactions
            .saveTransactions(transactions.results, accountId, users[1].id)
            .then((savedRows) => {
                expect(savedRows.length === 0).toEqual(false);
            })
            .catch((e) => {
                // We expect that this should fail
                expect(2).toEqual(3);
            });

        // We flush the redis cache
        client.flushdb((err, succeeded) => {
            console.log(succeeded);
        });

        request(app)
            .get('/user/transactions/stats')
            .set('x-auth', users[1].app_token)
            .end((err, res) => {

                expect(res.statusCode).toEqual(200);

                const results = res.body.Statistics;

                expect(results).toEqual(response);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(true);

                // Authenticated token has not expired and will be sent back in the response
                expect(res.header['x-auth']).toEqual(users[1].app_token);

                done();
            });
    });

    it('should return account transaction statistics', (done) => {

        const transactions = require('./json/transactions-user1.json');

        const response = require(__dirname + '/json/statistics.json');

        const req = {
            originalUrl: 'https://random.com',
            user_id: 'mayankamencherla',
            token: {
                app_token: 'randomToken'
            }
        };

        const stats = service.getTxnCategoryStats(req, transactions.results);

        expect(stats).toEqual(response);

        done();
    });

    it('should return return empty response for 0 transactions', (done) => {

        const req = {
            originalUrl: 'https://random.com',
            user_id: 'mayankamencherla',
            token: {
                app_token: 'randomToken'
            }
        };

        const stats = service.getTxnCategoryStats(req, []);

        expect(stats).toEqual([]);

        done();
    });

    it('should get stats with 1 transaction as input', (done) => {

        const transactions = require('./json/transactions-user1.json');

        const response = [
            {
                "INTEREST": {
                    "min": 0.77,
                    "max": 0.77,
                    "average": 0.77
                }
            }
        ];

        const req = {
            originalUrl: 'https://random.com',
            user_id: 'mayankamencherla',
            token: {
                app_token: 'randomToken'
            }
        };

        const stats = service.getTxnCategoryStats(req, [transactions.results[0]]);

        expect(stats).toEqual(response);

        done();
    });

});
