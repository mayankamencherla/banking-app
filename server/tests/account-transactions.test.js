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

    // it('should pass authentication and fetch user transactions', (done) => {

    // });
});
