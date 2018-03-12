require('dotenv').config();

const expect                 = require('expect');
const request                = require('supertest');
const nock                   = require('nock');
const {DataAPIClient}        = require('truelayer-client');

const {app}                  = require('./../server');
const {User}                 = require('@models/User');
const service                = require('@services/authentication/Service');
const {errorcodes}           = require('@errorcodes');
const {errormessages}        = require('@errormessages');

// Test for authentication flow
describe('Authentication + Authorization via Truelayer', () => {

    it('should redirect to truelayer auth page', (done) => {

        request(app)
            .get('/')
            .end((err, res) => {

                const urlSet = res.header.hasOwnProperty('location');

                expect(urlSet).toEqual(true);

                done();
            });
    });

    it('should handle unauthorized callback from Truelayer', (done) => {

        request(app)
                .get('/callback?error=access_denied')
                .end((err, res) => {

                    expect(res.statusCode).toEqual(401);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

                    const errorCode = errorcodes.SERVER_ERROR_TRUELAYER_CALLBACK_ERROR;

                    const errorMessage = errormessages.SERVER_ERROR_TRUELAYER_CALLBACK_ERROR;

                    expect(res.body).toEqual({
                        http_status_code: 401,
                        error: errorCode,
                        error_message: errorMessage
                    });

                    done();
                });
    });

    it('should fail validation for non alpha num code in callback', (done) => {

        request(app)
                .get('/callback?code=bakshdjbr34--asd')
                .end((err, res) => {

                    expect(res.statusCode).toEqual(401);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(false);

                    const errorCode = errorcodes.SERVER_ERROR_TRUELAYER_CALLBACK_ERROR;

                    const errorMessage = errormessages.SERVER_ERROR_TRUELAYER_CALLBACK_ERROR;

                    expect(res.body).toEqual({
                        http_status_code: 401,
                        error: errorCode,
                        error_message: errorMessage
                    });

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

            const response = require(__dirname + '/json/info.json');

            // mock the get info API call to Truelayer
            nock('https://api.truelayer.com')
                .get('/data/v1/info')
                .reply(200, response);

            request(app)
                .get('/callback?code=2')
                .end((err, res) => {

                    expect(res.statusCode).toEqual(200);

                    const results = res.body.Info;

                    expect(results).toEqual(response.results);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    expect(xAuthSet).toEqual(true);

                    done();
                });
            } else {
                done();
            }
    });

    it('should handle token exception case in callback flow', (done) => {

        // Mock the token exchange API call to Truelayer
        nock('https://auth.truelayer.com')
            .post('/connect/token')
            .reply(404, {error: "request account not found"});

        request(app)
            .get('/callback?code=2')
            .end((err, res) => {

                expect(res.statusCode).toEqual(502);

                const xAuthSet = res.header.hasOwnProperty('x-auth');

                expect(xAuthSet).toEqual(false);

                const errorCode = errorcodes.SERVER_ERROR_TOKEN_EXCHANGE_FAILURE;

                const errorMessage = errormessages.SERVER_ERROR_TOKEN_EXCHANGE_FAILURE;

                expect(res.body).toEqual({
                    http_status_code: 502,
                    error: errorCode,
                    error_message: errorMessage
                });

                done();
            });
    });

    it('should handle token exception case in data info fetch flow', (done) => {

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

            // Mock the token exchange API call to Truelayer
            nock('https://api.truelayer.com')
                .get('/data/v1/info')
                .reply(
                    404, {
                        error: "invalid access token"
                    });

            request(app)
                .get('/callback?code=2')
                .end((err, res) => {

                    expect(res.statusCode).toEqual(401);

                    const xAuthSet = res.header.hasOwnProperty('x-auth');

                    //
                    // This will be set to true, because token will be created
                    // in the step before gaining access to the user info
                    //
                    expect(xAuthSet).toEqual(true);

                    const errorCode = errorcodes.SERVER_ERROR_CUSTOMER_INFO_FETCH_FAILED;

                    const errorMessage = errormessages.SERVER_ERROR_CUSTOMER_INFO_FETCH_FAILED;

                    expect(res.body).toEqual({
                        http_status_code: 401,
                        error: errorCode,
                        error_message: errorMessage
                    });

                    done();
                });

        } else {
            done();
        }
    });
});
