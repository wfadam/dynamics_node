"use strict"
var express = require('express');
var app = express();
var redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
        throw new Error ( err )
});

app.get('/TCR/:tcr/:fd', function (req, res) {
	console.log( req.url )

	var key = req.params.tcr.toUpperCase()
	var field = req.params.fd.toUpperCase()
	client.hget( key, field, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}
		res.send( value )

	})
});

app.get('/TCR/:tcr', function (req, res) {
	var key = req.params.tcr
	client.hgetall( key, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}
		var msg = []
		for ( var fd in value ) {
			var text 
			switch( fd ) {
			case 'QUEUE':
				var qName = value[fd].startsWith('<') ? value[fd].substr(1, value[fd].length-2) : value[fd]
				text = '<a href="http://mtte:3000/queue/' + qName + '">'+value[fd].replace('<', '&lt;')+'</a>'
				break
			case 'PE':
				text = '<a href="http://mtte:3000/queue/' + value[fd] + '">'+value[fd]+'</a>'
				break
			default:
				text = value[fd]
			}

			msg.push( [fd, text].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
});

app.get('/HISTORY/:te', function (req, res) {
	var teArr = req.params.te.split(' ')
	for ( var i in teArr ) {
		teArr[i] = teArr[i].charAt(0).toUpperCase() + teArr[i].substr(1)
	}
	var key = teArr.join(' ')
	client.hgetall( key, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}
		var msg = []
		for ( var fd in value ) {
			msg.push( [fd, value[fd]].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
});


app.get('/QUEUE/:te', function (req, res) {
	var teArr = req.params.te.split(' ')
	for ( var i in teArr ) {
		teArr[i] = teArr[i].charAt(0).toUpperCase() + teArr[i].substr(1)
	}
	var key = '<' + teArr.join(' ') + '>'
	client.hgetall( key, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}

		var msg = []
		for ( var fd in value ) {
			var tcrlnk = '<a href="http://mtte:3000/tcr/' + fd + '">'+fd+'</a>'
			msg.push( [tcrlnk, value[fd]].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
});

app.get('/WILD', function (req, res) {

	hgetall( "Submitted TCRs ex2", res )
	hgetall( "Submitted TCRs ex3", res )
	hgetall( "Submitted TCRs KGD", res )
	setTimeout( function(){ res.end() }, 1000)

});


function hgetall( key, res ) {
	client.hgetall( key, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}
		var msg = []
		for ( var fd in value ) {
			msg.push( [value[fd], fd].join(' ') )
		}
		res.write( msg.join('<br>') )
	})
}

function handleErr(err,value){
	var msg = ''
	if ( err ) {
		console.log( err )
		msg += '\n' + err['code']
	}
	if ( ! value ) {
		msg += '\n' + 'check the URL'
	}
	return msg
}




app.get( '/QUEUE', function (req, res) {
	client.keys('<*', function(err, value){
		res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
		var msg = []
		for ( var i in value ) {
			var teName = value[i].substr(1,value[i].length-2)
			var lnk = '<a href="http://mtte:3000/queue/' + teName + '">'+teName+'</a>'
			msg.push( [parseInt(i)+1, lnk].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
});



app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

