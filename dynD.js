"use strict"

process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.kill()
});

const MAX_WORKERS = 3
const UPDATE_PERIOD = 180*1000
const DO_JOBS_PERIOD = 3*1000

var ONJOB_WORKERS = 0
var qLen = 0

var math = require('mathjs')
var exec = require('child_process').exec;
var redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
	throw new Error ( err )
});


// move tcr list to the in queue
startPrcess('node ./list_url_in_queue.js', 1)
setInterval( function(){
	startPrcess('node ./list_url_in_queue.js', 1)
}, UPDATE_PERIOD )


// move last updated TCRs to the out queue
setInterval( function(){
	client.lrange( 'inQueue', 0, -1, function(err, value) {
		if ( value.length > 0 ) {
			//console.log( 'inQueue length: ' + value.length )
			for ( var i=0; i<value.length; i++ ) {
				var fds = value[i].split(',')
				const tcrN = fds[0]
				const modT = fds[1]
				client.hget('TCR_MODT', tcrN, function(e,v) {
					var act;
					if ( v === modT ) {
						act = function(e2,v2){ }
					} else {
						console.log( 'Sending ' + tcrN + ' for update' )
						act = function(e2,v2){client.sadd( 'outQueue', v2, function(e3,v3){ }) }
					}
					client.lpop( 'inQueue', act)
				})
			}
		}
	})
}, DO_JOBS_PERIOD )

// process the out queue
setInterval( function(){
	client.scard('outQueue', function(err, value) {
		qLen = parseInt( value )
		if ( ONJOB_WORKERS > 0 ) {
			console.log( 'Queued jobs : ' + qLen + ' , Ongoing jobs : ' + ONJOB_WORKERS )
		}

		var needWorkers  = math.min(qLen, MAX_WORKERS)
		var idleWorkers  = MAX_WORKERS-ONJOB_WORKERS
		var readyWorkers = math.min(needWorkers , idleWorkers )
		startPrcess('node ./tcr_worker.js', readyWorkers)
	})

}, DO_JOBS_PERIOD )


function startPrcess(cmdL, cnt) {
	if ( cnt === 0 ) {
		return
	}
	for ( var wkn =0; wkn<cnt; wkn++ ) {
		++ONJOB_WORKERS

		exec(cmdL, function(error, stdout, stderr) {
				--ONJOB_WORKERS
				if (stderr){
					console.log('stderr: ', stderr);
				}
				console.log( stdout );
				if (error) {
					console.log('exec error: ', error);
				}
			});
	}

	console.log('Dispatched ' + cnt + ' worker(s) : ' + cmdL )
}
