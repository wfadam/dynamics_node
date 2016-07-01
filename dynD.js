"use strict"

process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.kill()
});

const MAX_WORKERS = 10
const UPDATE_PERIOD = 1800*1000
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


startPrcess('node ./list_url_in_queue.js', 1)
setInterval( function(){
	startPrcess('node ./list_url_in_queue.js', 1)
}, UPDATE_PERIOD )

setInterval( function(){
	client.llen('outQueue', function(err, value) {
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
	var wkn = 0
	for ( wkn =0; wkn<cnt; wkn++ ) {
            ONJOB_WORKERS++;

            exec(cmdL, function(error, stdout, stderr) {
                ONJOB_WORKERS--;
                console.log('stderr: ', stderr);
                console.log('stdout: ', stdout);
                if (error !== null) {
			console.log('exec error: ', error);
                }
            });
	}
	console.log('Dispatched ' + cnt + ' worker(s) : ' + cmdL )
}

