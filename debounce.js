process.on('uncaughtException', (err) => {
	throw err;
});

const redis = require('redis');
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const client = redis.createClient(6379, 'localhost');
const ongoing = {};

const THROTTLE_TIME = 1000;
const JOB_DELAY_TIME = 10000;
const BOUNCE_TOLERANCE = 2000;

function initJob(tcr) {
	ongoing[tcr] = 1;
}

function incJob(tcr) {
	ongoing[tcr] += 1;
}

function removeJob(tcr) {
	let cnt = ongoing[tcr];
	console.log(`finished ${tcr} after deferred ${cnt} times`);
	delete ongoing[tcr];
}

async function checkNfire() {
	const key = 'jjj';
	const tcr = await client.spopAsync(key);
	if (! tcr) return; 
	if(tcr in ongoing) {
		incJob(tcr);
		return;
	}
	initJob(tcr);
	let lastCnt = ongoing[tcr];

	const deferJob = () => { 
		console.log(`deferred ${tcr}`);
		return setTimeout(() => {
			client.saddAsync('kkk', tcr)
				.then(() => removeJob(tcr));
		}, JOB_DELAY_TIME)};

	let schdJob = deferJob();
	let polling = setInterval(() => {
		const currCnt = ongoing[tcr];
		if (lastCnt === currCnt) {
			clearInterval(polling);
		} else {
			lastCnt = currCnt;
			clearTimeout(schdJob);
			schdJob = deferJob();
		}
	}, BOUNCE_TOLERANCE);

}


/* Execution starts here */
try {
	setInterval(checkNfire, THROTTLE_TIME);
} catch (err) {
	console.log(err);
}
