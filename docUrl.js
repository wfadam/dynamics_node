const auth = require('./auth.js');
const httpntlm = require('httpntlm');
const htmlparser = require("htmlparser2");

function getSharepointLocationId(url) {
	return new Promise((resolve, reject) => {
		const options = Object.assign({ url }, auth.options);
		httpntlm.get(options, (err, res) => {
			if (! res.statusCode || res.statusCode === 401) reject(err);
			else resolve(res.body);
		});
	}).then(body => {
		let found = body.match('<sharepointdocumentlocationid>({[0-9A-Z-]+})');
		if(! found) throw new Error(`Cannot find sharepointdocumentlocationid from ${url}`);
		return found[1];
	});
}

function querySharepointLocation(did) {
	const genPayload = did => `<?xml version="1.0" encoding="utf-8" ?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><RetrieveAbsoluteAndSiteCollectionUrl xmlns="http://schemas.microsoft.com/crm/2009/WebServices"><logicalName>sharepointdocumentlocation</logicalName><entityId>${did}</entityId></RetrieveAbsoluteAndSiteCollectionUrl></soap:Body></soap:Envelope>`;

	return new Promise((resolve, reject) => {
		const options = Object.assign({
			url: 'http://dynamics.sandisk.com/Dynamics/AppWebServices/DocumentManagementWebService.asmx', 
			headers: { 'Content-Type': 'text/xml' }, 
			body: genPayload(did)
			},
			auth.options
		);
		httpntlm.post(options, (err, res) => {
			if (! res.statusCode || res.statusCode === 401) reject(err);
			else resolve(res.body);
		});
	});
}

function parseLocationUrl(xml) {
	return new Promise((resolve, reject) => {
		let arr = '';
		const parser = new htmlparser.Parser({
			ontext: text => arr = text,
			onend: () => resolve(arr)
		}, {decodeEntities: true});
		parser.write(xml);
		parser.end();
	});
}

exports.getDocLocation = getDocLocation;
async function getDocLocation(uid) {
	const dynamicsUrl = `http://dynamics.sandisk.com/Dynamics/tools/documentmanagement/areas.aspx?oId=%7b${uid}%7d&oType=10061`;
	const locId = await getSharepointLocationId(dynamicsUrl); //console.log({locId});
	const xml = await querySharepointLocation(locId);					//console.log({xml});
	const sharepointUrl = await parseLocationUrl(xml);				//console.log({sharepointUrl});
	return sharepointUrl;
}

if(require.main === module) {
	getDocLocation('6a3bc53a-8d16-e811-80e3-005056ab451f');
}

