const path = require('path');
const cheerio = require('cheerio');
const auth = require('./auth.js');
const httpntlm = require('httpntlm');
const redis = require('redis');
const bluebird = require('bluebird');
const { getDocLocation } = require('./docUrl.js');

const redisClient = () => redis.createClient(6379, 'localhost');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

async function getUrl(title, uid) {
  const encodeParentheses = url => url.replace(/\(/g, '%28').replace(/\)/g, '%29');
	const sharepointUrl = await getDocLocation(uid);
	const found = sharepointUrl.match(/\/sites\/.*/);
  const sprocketURI = encodeURIComponent(found ? found[0] : '');
  return `http://sprocketus.sandisk.com/sites/engdyncrm/zsd_tcrrequest/Forms/AllItems.aspx?RootFolder=${encodeParentheses(sprocketURI)}`;
}

function pageContent(url) {
  return new Promise((resolve, reject) => {
    httpntlm.get(Object.assign({ url }, auth.options), (err, res) => {
      if (! res || res.statusCode === 401) reject(err);
			else resolve(res.body);
    });
  });
}

function fileList(pageBody) {
  const $ = cheerio.load(pageBody);
  const dom = $('a[onfocus="OnLink(this)"]', '#aspnetForm');
  const files = {};
  Object.keys(dom)
    .filter(fd => !isNaN(fd))
    .forEach((fd) => {
      const filePath = dom[fd].attribs.href;
      files[path.basename(filePath)] = `http://sprocketus.sandisk.com${filePath}`;
		});
	return files;
}

async function queryDB(tcr, ...args) {
	const client = redisClient();
	const res = await client.hmgetAsync(tcr, args);
	client.quit();
	return res;
}

async function updateDB(key, field, val) {
	const client = redisClient();
	const res = await client.hsetAsync(key, field, val);
	client.quit();
	return res;
}

async function updateAttachment(tcr) {
	if (!tcr) return;
	const [title, uid] = await queryDB(tcr, 'TITLE', 'UID');
	if (!title || !uid) throw new Error('Either TITLE or UID is invalid');

	const url = await getUrl(title, uid); //console.log({url});
	const content = await pageContent(url);
	const list = fileList(content);
	if (Object.keys(list).length === 0) return console.log(`No attachment found for ${tcr}`);

	console.log(`${(new Date()).toString()} | ${tcr} | ${Object.keys(list)}`);
	await updateDB(tcr, 'DOC', JSON.stringify(list));
}

async function poll() {
	const key = 'JOBS:DOC';
	const client = redisClient();
	const tcr = await client.spopAsync(key);
	client.quit();
	try {
		await updateAttachment(tcr);
	} catch(err) {
		console.error(`${(new Date()).toString()} | ${err}`);
	}
}

poll();
