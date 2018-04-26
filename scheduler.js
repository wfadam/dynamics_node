const redis = require('redis');
const {get_UID_data} = require('./updateTCR.js');

function work_on_TCR() {
	let client = redis.createClient(6379, 'localhost');

	client.on('error', (err) => {
		console.log(err);
	});
	client.spop('JOBS:etc=10061', (err, uid) => {
		if(err) return console.log(err);

		if(uid) {
			get_UID_data(10061, uid); //1st PASS
			setTimeout(()=> get_UID_data(10061, uid), 60*1000); //2nd PASS as tcr content change lags behind
		}

		setTimeout(() => client.quit(), 1000);
	});
}

work_on_TCR();
setInterval(() => work_on_TCR(), 5*1000);
