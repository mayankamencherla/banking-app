require('dotenv').config();

const jwt                    = require('jsonwebtoken');
const {ObjectID}             = require('mongodb');
const expect                 = require('expect');
const request                = require('supertest');
const nock                   = require('nock');
const {DataAPIClient}        = require('truelayer-client');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const {users, populateUsers} = require('@seed/seed');

// run seed before each test case
beforeEach(populateUsers);

describe('Test account transaction statistics route', () => {

    it('should assert that authentication fails', (done) => {

        //
        // x-auth token not sent
        // So middleware sends back a 401
        // as an exception will be caught
        //
        request(app)
            .get('/account/1/statistics')
            .expect(401)
            .end(done);
    });

});
