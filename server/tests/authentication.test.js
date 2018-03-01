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

        // We want to run this test case only with a valid token in the env
        if (DataAPIClient.validateToken(process.env.ACCESS_TOKEN) === true) {

            // Mock the token exchange API call to Truelayer
            nock('https://auth.truelayer.com')
                .post('/connect/token')
                .reply(
                    200, {
                        access_token: process.env.ACCESS_TOKEN,
                        refresh_token: process.env.REFRESH_TOKEN,
                    });

            // mock the get info API call to Truelayer
            nock('https://api.truelayer.com')
                .get('/data/v1/info')
                .reply(
                    200, {
                        result: {
                            // TODO: Fill this one out
                        }
                    });

            request(app)
                .get('/callback?code=2')
                .expect(200)
                .end((err, res) => {

                    expect(res.body.Info.result).toEqual({});

                    done();
                });
            } else {
                done();
            }
    });

});
