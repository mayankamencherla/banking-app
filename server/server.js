var express = require('express');
var http    = require('http');

var app = express();
var server = http.createServer(app);

app.get('/', function(req, res){
	res.send('Hello world!');
});


server.listen(3000, () => {
	console.log('Server is hosted on 3000');
});