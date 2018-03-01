// In-house files
const {User}                         = require('./models/User');
const {mongoose}                     = require('./db/mongoose');

// built in libraries
const fs                             = require('fs');
const http                           = require('http');
const path                           = require('path');

// 3rd party libraries
const express                        = require('express');
const bodyParser                     = require('body-parser');
const {AuthAPIClient, DataAPIClient} = require('truelayer-client');

// server
const app            = express();
const server         = http.createServer(app);

// We ensure that every request is a json, as this is a JSON API
app.use(bodyParser.json());

fs.readdirSync(path.join(__dirname, 'controllers')).forEach((directory) => {
    fs.readdirSync(path.join(__dirname, 'controllers', directory)).forEach((file) => {
        if (file.substr(-3) === '.js') {
            var filePath = path.join(__dirname, 'controllers', directory, file);
            var route = require(filePath);
            route.controller(app);
        }
    });
});

server.listen(3000, () => {
	console.log('Server is hosted on 3000');
});
