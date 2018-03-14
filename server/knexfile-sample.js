/**
 * This file is a sample file that helps configure the DB
 */

const envalid                        = require('envalid');

const env = envalid.cleanEnv(process.env, {
    NODE_ENV     : envalid.str(),
});

var connection = {
    user: 'root',
    password: 'password',
    database: 'banking_app'
};

if (process.env.NODE_ENV === 'production') {
    connection.host = 'mysql';
}

module.exports = {
  client: 'mysql',
  connection
};
