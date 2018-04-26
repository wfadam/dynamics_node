const redis = require('redis');
const bluebird = require("bluebird");
const updateTCR = require("./updateTCR.js");
const timeDiff = require("./time.js").timeDiff;
const timeFmt = require("./time.js").timeFmt;
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
let entities = require("entities");

const daysBack = 90;

function sortQueue(key, resHdlr) {
	let client = redis.createClient(6379, 'localhost');
	client.sortAsync(key , 'by', '*->MODT'
		, 'get', '*->MODT'					//0
		, 'get', '#'                //1
		, 'get', '*->CATEGORY'      //2
		, 'get', '*->STATUS'        //3
		, 'get', '*->STAGE'         //4
		, 'get', '*->TE'            //5
		, 'get', '*->PE'            //6
		, 'get', '*->TITLE'         //7
		, 'get', '*->PRODUCT'       //8
		, 'get', '*->QUEUE'         //9
		, 'get', '*->COMMIT'        //10
		, 'desc'
	) 
		.then(res => {// build objects
			let fdCnt = 11;
			let arr = [];
			for(let i = 0; i < res.length; i += fdCnt){
				let [modT, tcr, category, status, stage, te, pe, title, product, queue, commit] = res.slice(i, i + fdCnt);
				arr.push({modT, tcr, category, status, stage, te, pe, title, product, queue, commit});
			}
			return arr;
		})
		.then(arr => {// filter TCRs by time
			let past = new Date();
			past.setDate(past.getDate() - daysBack - 1);
			return arr.filter(obj => {
				return past <= obj.modT && obj.modT <= Date.now();
			});
		})
		.then(arr => {// filter TCRs by status
			let activeArr = arr.filter(obj => {
				if(obj.status && obj.status.includes('Cancel')) {
					return false;
				}

				if(obj.pe === key) {
					return  true;
				}

				if('PETE TE' === key) {
					return  true;
				}

				if(obj.te === key || obj.queue.includes(key)){ // for TE
					return obj.stage.includes('Assigned')
						|| obj.stage.includes('Submitted')
						|| obj.stage.includes('Development');
				}

				return false;
			});
			return activeArr;
		})
		.then(arr => {// display content
			let now = Date.now();
			let body = [`<b><font size="5">${arr.length}</font></b> active TCRs in last ${daysBack} days<BR>`];
			for(let obj of arr) {
				let line = [];
				for(let fd in obj) {
					if(! obj[fd]) continue;

					switch(fd) {
						case 'tcr':
							line.push(`<a href="/tcr/${obj[fd]}">${obj[fd]}</a>`);
							break;
						case 'te':
							let val = obj[fd].trim() ? obj[fd] : obj['queue'].slice(1,-1)
							line.push(`<a href="/queue/${val}">${val}</a>`);
							break;
						case 'pe':
							line.push(`<a href="/queue/${obj[fd]}">${obj[fd]}</a>`);
							break;
						case 'modT':
							line.push(timeFmt(timeDiff(now - obj[fd])));
							break;
						case 'stage':
							if(key === obj['te'] && obj[fd].includes('Development')) {
								line.push(`<b><font size="5">${obj[fd]}</font></b>`);
								break;
							}
							if(obj['category'].includes('MT')
								&& obj['queue'].includes('PETE TE')
									&& obj[fd].includes('Submitted')) {
										line.push(`<b><font size="5">${obj[fd]}</font></b>`);
										break;
									}
							line.push(obj[fd]);
							break;
						case 'status':
							if(obj[fd].includes('In Progress')) break;
							line.push(obj[fd]);
							break;
						case 'product':
							if(! obj[fd].trim()) break;
							line.push(obj[fd]);
							break;
						case 'queue':
							break;
						default:
							line.push(obj[fd]);
							break;
					}
				}
				body.push(line.join(' | '));
			}
			let msg = body.join('<BR>');
			resHdlr.send(msg || `Nothing found in the last ${daysBack} days`);
		})
		.then(() => client.quit())
		.catch((err) => {
			resHdlr.send('Failed to get data from database');
			client.quit();
			console.log(err);
		});
}

exports.sortQueue = sortQueue;

