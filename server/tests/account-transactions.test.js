require('dotenv').config();

const expect                 = require('expect');
const request                = require('supertest');
const nock                   = require('nock');
const {DataAPIClient}        = require('truelayer-client');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const {users, populateUsers} = require('@seed/seed');

// run seed before each test case
beforeEach(populateUsers);

describe('Fetching account transactions', () => {

    it('should assert that authentication fails', (done) => {

        //
        // x-auth token not sent
        // So middleware sends back a 401
        //
        request(app)
            .get('/account/1/transactions')
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
                .expect(200)
                .end((err, res) => {

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

    // it('should fail token validation and create new token and fetch transactions', (done) => {

    // });
});
