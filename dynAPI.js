"use strict"
const bluebird = require("bluebird");
const cowork = require("./cowork.js");
const queue = require("./queue.js");
//const whoisleaving = require("./whoisleaving.js");
const express = require('express');
const app = express();
const redis = require("redis");
const router = express.Router();
const client = redis.createClient(6379, 'localhost');
const entities = require("entities");
const path = require('path');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

client.on("error", function(err) {
	throw new Error ( err )
});

router.use(function(req, res, next) {
	saveIP(req)
	console.log([req.method, req.url, req.ip, (new Date()).toString()].join('\t'));
	next(); // make sure we go to the next routes and don't stop here
});

app.use('/', router);

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});

router.route('/')
	.get(function(req, res) {
		res.send('Hooray! Welcome to the Dynamics API!' );   
	});

//router.route('/WHOISLEAVING')
//	.get(function(req, res) {
//		whoisleaving.whoIsLeaving(res);
//	});


router.route('/COWORK')
	.get((req, res) => {
		let body = [];
		cowork.updatePETE()
			.then(() => 
				client.zrevrangeAsync('CO:ALL', 0, -1, 'withscores')
					.then((data) => {
						let i = 0;
						for(let i = 0; i < data.length; i += 2) {
							let tcrCnt = data[i + 1];
							let [pe, te] = data[i].split(',')
							let peQueueUrl = `<a href="/queue/${pe}">${pe}</a>`;
							let teQueueUrl = `<a href="/queue/${te}">${te}</a>`;
							body.push(`${tcrCnt} TCRs by ${teQueueUrl} and ${peQueueUrl}`);
						}
						res.send(body.join('<BR>'));
					})
			)
			.catch((err) => console.log(err));
	});


router.route('/TCR/:tcr/:fd')
	.get(function (req, res) {
		let key = req.params.tcr.toUpperCase()
		let field = req.params.fd.toUpperCase()
		client.hget( key, field, function(err, value){
			if ( handleErr(err, value) ) {
				res.send( 'Sorry, no reuslt' )
				return
			}
			res.send( value )

		})
	});

function toHTML(str) {
	try {
		let fobj = JSON.parse(str);
		let res = []
		for(let file in fobj) {
			let url = `<a href="${fobj[file]}">${file}</a>`;
			res.push(url);
		}
		console.log(res.join("<BR>"));
		return res.join("<BR>");
	} catch(err) {
		return str;
	}
}

router.route('/TCR/:tcr')
	.get(function (req, res) {
		let key = req.params.tcr
		client.hgetall( key, function(err, value){
			if ( handleErr(err, value) ) {
				res.send( 'Sorry, no reuslt' )
				return
			}
			let msg = []
			for(let fd in value) {
				let text 
				switch( fd ) {
					case 'PROGRAM':
					case 'FLOW':
						text = `<b>${value[fd] || 'unknown'}</b>`;
						break;
					case 'QUEUE':
						let qName = value[fd].startsWith('<') ? value[fd].substr(1, value[fd].length-2) : value[fd]
						text = `<a href="/queue/${escape(qName)}">${value[fd].replace('<', '&lt;')}</a>`
						break
					case 'PE':
					case 'TE':
						text = `<a href="/queue/${escape(value[fd])}">${value[fd]}</a>`
						break
					case 'URL':
						text = `<a href="${value[fd]}">Dynamics</a>`;
						break;
					case 'DOC':
						text  = '<BR>=============================================================================<BR>';
						text += toHTML(value[fd]);
						text += '<BR>=============================================================================<BR>';
						break;
					case 'BASE_PRO':
					case 'OUT_PRO':
					case 'TITLE':
					case 'RELEASE':
						text = value[fd]
						break;
					case 'REQUEST':
						text  = '<BR>=============================================================================<BR>';
						text += entities.decodeHTML(value[fd]);
						text += '<BR>=============================================================================<BR>';
						break;

					default:
						break;
				}

				if(text) {
					msg.push( [fd, text].join(': ') )
				}
			}

			if(! value.hasOwnProperty('DOC')) {
				let docUrl = `http://dynamics.sandisk.com/Dynamics/tools/documentmanagement/areas.aspx?oId=%7b${value['UID']}%7d&oType=10061`;
				let text = `<a href="${docUrl}">Documents</a>`;
				msg.push(['DOC', text].join(': '));
			}

			res.send( `<head><title>${value['TCR']}:${value['FLOW'] || 'unknown flow'}</title></head>` + msg.join('<br>') );
		})
	});

router.route('/QUEUE/:name')
	.get(function (req, res) {
		let teArr = req.params.name.split(' ');
		for ( let i in teArr ) {
			teArr[i] = teArr[i].charAt(0).toUpperCase() + teArr[i].slice(1);
		}
		let key = teArr.join(' ');
		queue.sortQueue(key, res);
	});


function handleErr(err,value){
	let msg = ''
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


