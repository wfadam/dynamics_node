const redis = require('redis');
const bluebird = require("bluebird");
const updateTCR = require("./updateTCR.js");
const client = redis.createClient(6379, 'localhost');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let jobCnt = 0;
let donCnt = 0;
let errCnt = 0;

client.keysAsync('TCR-*')
	.then(res => {
		return res.filter(ele => ! ele.includes(':'));
	}).
	then(res => {
		return client.saddAsync('TCR_POOL', res);
	})
	.then(() => client.quit())
	.catch((err) => {
		return console.log(err);
	});

