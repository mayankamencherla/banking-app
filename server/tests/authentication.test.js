require('dotenv').config();

const expect                 = require('expect');
const request                = require('supertest');
const {ObjectID}             = require('mongodb');
const _                      = require('lodash');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const {users, populateUsers} = require('@seed/seed');

// run seed before each test case
beforeEach(populateUsers);

// Test for authentication flow
describe('Authentication + Authorization via Truelayer', () => {

    it('should redirect to truelayer auth page', (done) => {

        request(app)
            .post('/')
            .end((err, res) => {

                expect(res.header['location']).toBe('https://auth.truelayer.com/?response_type=code&client_id=interviewmayank-8nas&redirect_uri=http://localhost:3000/callback&scope=info%20accounts%20transactions%20offline_access&nonce=foobar&enable_mock=true');

                done();
            });
    });

    it('should handle callback from Truelayer Authorization server', (done) => {

        request(app)
            .get('/callback?code=2')
            .end((err, res) => {

                done();
            });

    });

});
