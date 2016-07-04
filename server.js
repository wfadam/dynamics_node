"use strict"

var http = require("http");

var redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
	throw new Error ( err )
});



http.createServer(function (request, response) {

	//client.hgetall('TCR-11719.0', function(err, value) {
	client.hgetall('Malvin Cui', function(err, value) {
		if ( err ) {
			console.log ( err )
		}

		var msg = JSON.stringify(value, null, 2)
		console.log ( msg )

		response.writeHead(200, {'Content-Type': 'text/plain'});
	   
		response.end(msg);
		client.quit()
	})
}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');



