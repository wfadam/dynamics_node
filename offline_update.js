const redis = require('redis');
const bluebird = require("bluebird");
const updateTCR = require("./updateTCR.js");
const updateAttachment = require("./attachment.js");
const client = redis.createClient(6379, 'localhost');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const daysBack = 1000;

let now = Date.now();
let until = new Date();
let past = new Date();
past.setDate(past.getDate() - daysBack);

let jobCnt = 0;
let donCnt = 0;
let errCnt = 0;

client.zrangebyscoreAsync('etc=10061', Date.parse(past), Date.now())
	.then((res) => {
		jobCnt = res.length;

		for(let uid of res) { 
			client.hgetAsync('UID2TCR', uid)
				.then((tcr) => {
					//m8w4dbreturn updateUserOfTCR(tcr);
					return updateAttachment(tcr);//a8w4db
				}).then(() => {
					++donCnt;
				}).catch((err) => {
					console.log(err);
					++errCnt;
				});
		}

		return new Promise((resolve, reject) => {
			let progress = setInterval(() => {
				//process.stdout.write('\x1Bc');//clear cli
				console.log(`Processing TCRs modified\nfrom ${past.toLocaleString()}\nto   ${until.toLocaleString()}`);
				console.log(`Jobs = ${jobCnt}, Done = ${donCnt}, Errors = ${errCnt}`);
				if(jobCnt === (donCnt + errCnt)) {
					clearInterval(progress);
					resolve();
				}
			}, 200);
		});
	})
	.then(() => client.quit())
	.catch((err) => {
		client.quit();
		console.log(err);
	});

function updateUserOfTCR(tcr) {
	return client
		.hmgetAsync(tcr, 'PE', 'TE')
		.then((res) => {
			let arr = []
			res.map((val) => {
				if(! val) return;
				arr.push( client.saddAsync(val, tcr));
			});
			//console.log(`${tcr} : ${res}`);
			return Promise.all(arr);
		});
}
