"use strict"
var express = require('express'),
    app = express(),
    redis = require("redis"),
    router = express.Router(),
    client = redis.createClient(6379, 'mtte');


client.on("error", function(err) {
        throw new Error ( err )
});

router.use(function(req, res, next) {
    saveIP(req)
    console.log([req.method, req.url, req.ip, (new Date()).toString()].join('\t'));
    next(); // make sure we go to the next routes and don't stop here
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


app.use('/', router);

router.route('/')
.get(function(req, res) {
    res.send('hooray! welcome to our dynamics api!' );   
});

router.route('/TCR/:tcr/:fd')
.get(function (req, res) {
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

router.route('/TCR/:tcr')
.get(function (req, res) {
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
					text = '<a href="http://mtte:3000/queue/' + escape(qName) + '">'+value[fd].replace('<', '&lt;')+'</a>'
					break
				case 'PE':
					text = '<a href="http://mtte:3000/queue/' + escape(value[fd]) + '">'+value[fd]+'</a>'
					break
				default:
					text = value[fd]
			}

			msg.push( [fd, text].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
});

router.route('/HISTORY/:te')
.get(function (req, res) {
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


router.route('/group/:name')
.get(function (req, res) {
	var key = req.params.name.toUpperCase()

	if ( key === 'WILD' ) {
		hgetall( "Submitted TCRs ex2", res )
		hgetall( "Submitted TCRs ex3", res )
		hgetall( "Submitted TCRs KGD", res )
		setTimeout( function(){ res.end() }, 1000)
		return
	}

	client.smembers( key, function(err, value){
		if ( handleErr(err, value) ) {
			res.send( 'Sorry, no reuslt' )
			return
		}

		var msg = []
		for ( var fd in value ) {
			msg.push( [parseInt(fd)+1, value[fd]].join(' ') )
		}
		res.send( msg.join('<br>') )
	})
});

router.route('/QUEUE/:name')
.get(function (req, res) {
	var teArr = req.params.name.split(' ')
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



router.route('/QUEUE')
.get(function (req, res) {
	client.keys('<*', function(err, value){
		res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
		var msg = []
		for ( var i in value ) {
			var teName = value[i].substr(1,value[i].length-2)
			var lnk = '<a href="http://mtte:3000/queue/' + escape(teName) + '">'+teName+'</a>'
			msg.push( [parseInt(i)+1, lnk].join(' : ') )
		}
		res.send( msg.join('<br>') )
	})
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
		res.write( key+'<br>' )
		res.write( msg.join('<br>') )
		res.write( '<br>' )
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



function saveIP(req) {
	client.hincrby('IP_CNTR', req.ip, 1, function(){})
	client.hset('ACCESS_DATE', req.ip, (new Date()).toString(), function(){})
}


