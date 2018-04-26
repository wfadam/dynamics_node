process.on('uncaughtException', (err) => {
	throw err;
});

const redis = require('redis');
const bluebird = require("bluebird");

const client = redis.createClient(6379, 'localhost');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

async function scanTCR() {
	const tcrs = await client.smembersAsync('TCR_POOL');
	const valid_pete = await validPETE(tcrs);
	const uniq_pete = uniqPETE(valid_pete);
	const coworkCnt = await workCnt(uniq_pete);
	return await Promise.all(uniq_pete.map((val, idx) => {
		//console.log(`${val} : ${coworkCnt[idx]}`);
		return client.zaddAsync('CO:ALL', coworkCnt[idx], val);
	}));
}

async function validPETE(tcrs) {
	const pete = await Promise.all(tcrs.map(tcr => client.hmgetAsync(tcr, 'PE', 'TE')));
	return pete.filter(res => res[0] && res[1] && (res[0] !== res[1]));
}

async function workCnt(pete) {
	const cowork = await Promise.all(pete.map(peteStr => client.sinterAsync(peteStr.split(','))));
	return cowork.map(res => res.length);
}

function uniqPETE(arr) {
	const obj = {};
	arr.forEach(res => obj[res] = 0);
	return uniq = Object.keys(obj)
}

if(require.main === module) {
	console.time('cowork');
	scanTCR();
	console.timeEnd('cowork');
}

exports.updatePETE = scanTCR;
