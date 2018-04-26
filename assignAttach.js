const {spawn} = require('child_process');
const redis = require('redis');
const bluebird = require('bluebird');

const redisClient = () => redis.createClient(6379, 'localhost');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const MAX_WORKER_CNT = 20;

async function poll() {
	const key = 'JOBS:DOC';
	const client = redisClient();
	const jobCnt = await client.scardAsync(key);
	client.quit();
	if(jobCnt === 0) return;

	const limit = Math.min(MAX_WORKER_CNT, jobCnt);
	for(let i = 0; i < limit; i++) {
		spawn('node', ['fetchAttach.js'], {stdio: 'inherit'});
	}
	console.log(`Observed ${jobCnt} attachment jobs and dispatched ${limit} workers`);
}

setInterval(() => poll(), 5000);
