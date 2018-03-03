const winston = require('winston');
const fs      = require('fs');

// We store logs in the storage directory
try {
    fs.mkdirSync(__dirname + '/../storage');
    fs.mkdirSync(__dirname + '/../storage/logs');
} catch (e) {
    if (e.code !== 'EEXIST') {
        throw e;
    }
}

const logger = new (winston.Logger) ({
    transports: [
        new (winston.transports.Console)({json: true, timestamp: true, handleExceptions: true}),
        new (winston.transports.File)({filename: __dirname + '/../storage/logs/debug.log', json: true, handleExceptions: true})
    ],
    exitOnError: false
});

module.exports = {logger};
