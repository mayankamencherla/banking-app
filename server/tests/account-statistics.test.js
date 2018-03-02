require('dotenv').config();

const jwt                    = require('jsonwebtoken');
const {ObjectID}             = require('mongodb');
const expect                 = require('expect');
const request                = require('supertest');
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

    it('should pass authentication and fetch account statistics', (done) => {

        const response = require(__dirname + '/json/statistics.json');

        request(app)
            .get('/account/1/statistics')
            .set('x-auth', users[1].tokens[0].token)
            .end((err, res) => {

                expect(res.statusCode).toEqual(200);

                const results = res.body.Statistics;

                expect(results).toEqual(response);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(true);

                // Authenticated token has not expired and will be sent back in the response
                expect(res.header['x-auth']).toEqual(users[1].tokens[0].token);

                done();
            });
    });

    it('should pass authentication and return 400 as user has no transactions', (done) => {

        request(app)
            .get('/account/1/statistics')
            .set('x-auth', users[2].tokens[0].token)
            .end((err, res) => {

                expect(res.statusCode).toEqual(400);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                done();
            });
    });

});
