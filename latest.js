const cheerio = require('cheerio');
const options = require("./auth.js").options;
const httpntlm = require('httpntlm');
const url = 'http://dynamics.sandisk.com/Dynamics/_root/homepage.aspx?etc=10061&pagemode=iframe&sitemappath=TEST%7cExtensions%7czsd_tcrrequest';
const shajs = require('sha.js');
const redis = require('redis');
const client = redis.createClient(6379, 'localhost');
client.on('error', err => console.log(err))
var repeater;

function get_TCR_UID() {
	httpntlm.get(Object.assign({url: url}, options), 
		(err, res) => {
			if(res['statusCode'] === 200) {
				let tcrs = parseTCR(res.body);
				createJobs(tcrs);
				repeater = setTimeout(() => get_TCR_UID(), 90*1000);
				console.log(res['statusCode']);
				return;
			}

			repeater = setTimeout(() => get_TCR_UID(), 5*60*1000);
			console.error(err);
		});
}

function parseTCR(html) {
	const $ = cheerio.load(html);
	let qs = queues($);
	let ids = uid($);
	const arr = spanVals($);
	let tcrs = tcrNum(arr);
	let modT = modTime(arr);
	return modT.map((el, i) => { return {
		'tcr':tcrs[i],
		'modT':el,
		'queue':qs[i],
		'uid':ids[i],
	}});
}

function spanVals(cheerObj) {
	let vals = []
	let rows = cheerObj('span[tabindex=0]');
	for(let i = 0; i < rows.length; i++) {
		if(rows[i].children.length != 1) continue;
		vals.push(rows[i].children[0].data);
	}
	return vals;
}

function queues(cheerObj) {
	let arr = [];
	let rows = cheerObj('span[otype=2020]');
	for(let i = 0; i < rows.length; i++) {
		arr.push(rows[i].attribs.title);
	}
	return arr;
}

function tcrNum(arr) {
	return arr.filter(el => el.includes('TCR-'));
}

function modTime(arr) {
	return arr
		.filter(el =>  el.includes(' PM') || el.includes(' AM'))
		.filter((el, i) => (i % 2) == 0);
}

function uid(cheerObj) {
	let arr = [];
	let rows = cheerObj('tr[otype=10061]');
	for(let i = 0; i < rows.length; i++) {
		let rawoid = rows[i].attribs.oid;
		arr.push(rawoid.substr(1, rawoid.length - 2));
	}
	return arr;
}

function createJobs(arr) {
	let key = 'etc=10061';
	for(let fdObj of arr) {
		let hash = parseInt(shajs('sha256').update(JSON.stringify(fdObj)).digest('hex'), 16);

		client.zadd(key, 'CH', hash, fdObj.uid, (err, cnt) => {
			if(err)	return console.error(err);
			if(cnt === 0) return;

			client.sadd(`JOBS:${key}`, fdObj.uid);
			client.sadd(`TCR_POOL`, fdObj.tcr);

			let queue = (! fdObj.queue || fdObj.queue.includes('Submitted TCRs ')) ? '<PETE TE>' : fdObj.queue;
			let score = Date.parse(fdObj.modT);
			client.hmset(fdObj.tcr, 'MODT', score, 'QUEUE', queue);
			client.sadd(queue.slice(1, -1), fdObj.tcr);
			console.log(`${fdObj.tcr} was modified on ${fdObj.modT}`);
		});
	}
}

get_TCR_UID();

