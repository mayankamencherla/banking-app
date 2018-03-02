require('dotenv').config();

const {ObjectID}                     = require('mongodb');
const {User}                         = require('@models/User');

const jwt                            = require('jsonwebtoken');

// Generate object ID's for the 3 user objects to be seeded into the DB
const userOneId   = new ObjectID();
const userTwoId   = new ObjectID();
const userThreeId = new ObjectID();

const transactions = require('./../json/transactions.json');

const users = [{
    _id: userOneId,
    // email: "mayank@gmail.com"
    tokens: [], // unauthenticated user
}, {
    _id: userTwoId,
    // email: "mayankamencherla@gmail.com",
    tokens: [{
        access: 'auth',
        token: jwt.sign({_id: userTwoId, access: 'auth'}, process.env.JWT_SECRET).toString(),
        access_token: process.env.ACCESS_TOKEN,
        refresh_token: process.env.REFRESH_TOKEN
    }],
    transactions: transactions.results,
}, {
    _id: userThreeId,
    // email: "mayankamencherla@gmail.com",
    tokens: [{
        access: 'auth',
        token: jwt.sign({_id: userThreeId, access: 'auth'}, process.env.JWT_SECRET).toString(),
        access_token: "random_access_token_that_will_fail_renewal",
        refresh_token: "random_refresh_token_that_will_fail_renewal"
    }],
    transactions: [],
}];

const populateUsers = (done) => {
    // Remove all user seed and insert new
    User.remove({}).then(() => {

        var userOne = new User(users[0]).save();
        var userTwo = new User(users[1]).save();
        var userThree = new User(users[2]).save();

        return Promise.all([userOne, userTwo, userThree]);
    })
    .then(() => done());
};

module.exports = {
    users,
    populateUsers
};
