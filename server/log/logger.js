const winston = require('winston');

// create the 2 logging files


const logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console)({json: true, timestamp: true}),
        new (winston.transports.File)({filename: __dirname + '/debug.log', json: true})
    ],
    exceptionHandlers: [
        new (winston.transports.Console)({json: true, timestamp: true}),
        new (winston.transports.File)({filename: __dirname + '/exception.log', json: true})
    ],
    exitOnError: false
});

module.exports = {logger};
