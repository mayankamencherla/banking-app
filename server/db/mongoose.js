require('dotenv').config();

const {logger}                       = require('@log/logger');
const {tracecodes}                   = require('@tracecodes');

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

logger.info({
    code: tracecodes.DB_CONNECTION_REQUEST,
    mongodb_uri: process.env.MONGODB_URI
});

mongoose.connect(process.env.MONGODB_URI);

module.exports = {mongoose};
