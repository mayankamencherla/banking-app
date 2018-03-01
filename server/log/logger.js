const winston = require('winston');

const logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console)({json: true, timestamp: true, handleExceptions: true}),
        new (winston.transports.File)({filename: __dirname + '/debug.log', json: true, handleExceptions: true})
    ],
    exitOnError: false
});

module.exports = {logger};
