// In-house files
const {User}                         = require('./../../models/User');
const {authenticate}                 = require('./../../middleware/authenticate');

// 3rd party libraries
const _                              = require('lodash');
const envalid                        = require('envalid');
const {AuthAPIClient, DataAPIClient} = require('truelayer-client');

// Cleaning the environment variables, TODO: Move this out to a different file
const env = envalid.cleanEnv(process.env, {
    CLIENT_ID     : envalid.str(),
    CLIENT_SECRET : envalid.str(),
    MOCK          : envalid.bool(),
    REDIRECT_URI  : envalid.url({default: "http://localhost:3000/callback"})
});

// picks up env variables automatically
const authClient = new AuthAPIClient();

module.exports.controller = (app) => {

    // This api must require authentication via the app token
    app.get('/account/:account_id/transactions', authenticate, async (req, res) => {
        const token = req.user.tokens[0]; // TODO: Multiple tokens can exist

        if (!DataAPIClient.validateToken(token.access_token)) {
            console.log('Invalid token');

            // get new access token and replace the existing token
            // What if wrong info passed here? exception handling??
            await authClient.refreshAccessToken(token.refresh_token)
                            .then((token) => {
                                // TODO: Will the object destructure itself
                                var user = new User(req.user);

                                // we add the token back to the user model
                                // TODO: how do we get the user object here?
                                user.generateAuthToken(token.access_token, token.refresh_token);
                            })
                            .catch((e) => {
                                console.log('Error: ', e);
                                res.status(400).send('Unable to refresh access token');
                            });
        }

        // TODO: Check this once - do this via then, catch
        const transactions = await DataAPIClient.getTransactions(token.access_token, req.params.account_id);


        // TODO: Do a dirty check and update only if different
        User.saveTransactions(transactions.results, req.user._id)
            .then((results) => {
                console.log('Saved user transactions in the DB');
            })
            .catch((e) => {
                console.log('Error', e);
                res.status(400).send('Unable to save transactions in User DB');
            });

        res.setHeader('x-auth', token.token);
        res.json({"Transactions": transactions});
    });

    // This endpoint does needs authentication, but will not hit the Truelayer API
    app.get('/account/:account_id/amounts', authenticate, async (req, res) => {

        const transactions = req.user.transactions;

        // All the amounts are in GBP
        const groupedTransactions = _.groupBy(transactions, tran => tran.transaction_category);

        var responseObj = _.transform(groupedTransactions, (result, value, key) => {

            var getMinMaxAve = (value) => {
                var min = Number.MAX_VALUE, max = 0, average = 0, total = 0;

                for (var i=0; i<value.length; i++) {
                    var amount = Math.abs(value[i].amount);

                    total += amount;

                    if (amount < min) {
                        min = amount;
                    }

                    if (amount > max) {
                        max = amount;
                    }
                }

                return {
                    min: min,
                    max: max,
                    average: total / value.length,
                };
            };

            var resultToPush = {[key]: getMinMaxAve(value)};

            result.push(resultToPush);

            return result;

        }, []);

        // TODO: Don't cache the response in the browser, cache it in the app
        res.setHeader('x-auth', req.user.tokens[0].token);
        res.json({"Transaction Statistics": responseObj});
    });

};
