const options = require("./auth.js").options;
const httpntlm = require('httpntlm');

function getURL(otyp, uid) {
	//return `http://dynamics.sandisk.com/Dynamics/form/Data.aspx?etc=${otyp}&id=%7b${uid}%7d&oid=${uid}`;
	return `http://dynamics.sandisk.com/Dynamics/form/Data.aspx?etc=${otyp}&id=%7b${uid}%7d`;
	//http://dynamics.sandisk.com/Dynamics/form/Data.aspx?etc=10173&id=%7bC0F6384D-98E6-E711-80E3-005056AB4520%7d
}


function get_UID_data(otyp, uid) {
	let url = getURL(otyp, uid);
	httpntlm.get(
		Object.assign(options, {url: url}), 
		function (err, res){
			if(err) return console.log(err);

			if(! res.body.includes('while(1);')) {
				return console.log(`bad json received: ${res.body.substr(0,16)}`);
			}

			let jsonObj;
			try {
				jsonObj = JSON.parse(res.body.substr('while(1);'.length))
			} catch (e) {
				return console.log(e);
			}

			//console.dir(jsonObj);
			let tcrJson =	filter(jsonObj); 
			save2redis('set', `${tcrJson.TCR}:${uid}`, JSON.stringify(jsonObj) );
			save2redis('hmset', tcrJson.TCR, map2arr(tcrJson));
			save2redis('sadd', tcrJson.TE, tcrJson.TCR);
			save2redis('sadd', tcrJson.PE, tcrJson.TCR);
			save2redis('sadd', tcrJson.PE2, tcrJson.TCR);
			save2redis('sadd', 'JOBS:DOC', tcrJson.TCR);
			console.log(`Saved ${tcrJson.TCR} ${(new Date()).toString()}`);
		});
}

function map2arr(json) {
	let arr = [];
	for(let key in json) {
		arr.push(key);
		arr.push(json[key]);
	}
	return arr;
}

function filter(jsonObj) {
	jsonObj.get = (field) => {
		try {
			return jsonObj.formData[field].value || '';
		} catch(e) {
			return '';
		}
	}

	return {
		FLOW: jsonObj.get('zsd_testtimetestflow'),
		UID: jsonObj.get('zsd_tcrrequestid'),
		TE: jsonObj.get('zsd_assignedte'),
		BASE_PRO: jsonObj.get('zsd_referencebasetestprogramlink'),
		OUT_PRO: jsonObj.get('zsd_sourcecodelink'),
		START: jsonObj.get('zsd_testartdate'),
		STOP: jsonObj.get('zsd_teenddate'),
		PE2: jsonObj.get('zsd_assignedtotpe'),
		PE: jsonObj.get('createdby'),
		//TESTER: jsonObj.get('zsd_tester') || jsonObj.get('zsd_hardware1'),
		TESTER: jsonObj.get('zsd_hardware1'),
		TITLE: jsonObj.get('zsd_tcrrequestname'), 
		MEMORY: jsonObj.get('zsd_memoryconfiguration'),
		AGILE: jsonObj.get('zsd_agileproductline'),
		PDT: jsonObj.get('zsd_pdtproject'),
		COMMIT: jsonObj.get('zsd_commitdate'),
		STAGE: jsonObj.get('zsd_stage'),
		STATUS: jsonObj.get('zsd_stagestatus'),
		PRODUCT: jsonObj.get('zsd_productdescription') || jsonObj.get('zsd_productline'),
		TCR: jsonObj.get('zsd_tcrnumber'),
		CATEGORY: jsonObj.get('zsd_category'),
		PROGRAM: jsonObj.get('zsd_testprogamname').toLowerCase(),
		RELEASE: jsonObj.get('zsd_releasetype'),
		REQUEST: jsonObj.get('zsd_detailscomments'),
		NUM_OF_DIE: jsonObj.get('zsd_numberofdie'),
		MODT: Date.parse(jsonObj.get('modifiedon')),
		URL: getWebURL(10061, jsonObj.get('zsd_tcrrequestid')),
		DOC: `http://dynamics.sandisk.com/Dynamics/tools/documentmanagement/areas.aspx?oId=%7b${jsonObj.get('zsd_tcrrequestid')}%7d&oType=10061`,
	};
}


function save2redis(cmd, key, value) {
	if(! key || ! value || ! key.trim()) return;

	let redis = require('redis');
	let client = redis.createClient(6379, 'localhost');
	client[cmd]( key, value, (err, msg) => {
		if(err) return console.log(err);
		client.quit();
	});
}

function getWebURL(otyp, uid) {
	return `http://dynamics.sandisk.com/Dynamics/main.aspx?etc=${otyp}&id=%7b${uid}%7d&newWindow=true&pagetype=entityrecord`;
}

exports.get_UID_data = get_UID_data;
exports.save2redis = save2redis;
exports.filter = filter;
exports.map2arr = map2arr;

//get_UID_data(10061, '086a1e28-d3d6-e611-80dc-f5f3a568eeb9');
