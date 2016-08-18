
var redis  = require("redis"),
    client = redis.createClient(6380, 'mtte');

var telnet = require('telnet-client');
var cmd = 'kpwd&>/dev/null && (echo -n "TESTER_STATUS "; kstat &>/dev/null; echo -n $?; kstat 2>/dev/null | grep -q TESTING; echo $?; ecotsrdsymbol ECOTS_SD_PROGRAMNAME ECOTS_SD_TesterMachineID ECOTS_SD_LOTNUMBER_AND_CURTIME ECOTS_SD_DatalogFilename ECOTS_SD_DATALOGFOLDER ECOTS_SD_DutCount ECOTS_SD_SETTEMP ECOTS_SD_MEASTEMP ECOTS_SD_TESTERTYPE ECOTS_SD_TOUCHDOWNS ECOTS_SD_PhaVersion ECOTS_SD_SERVERGET ECOTS_SD_PBTYPE ECOTS_SD_TOTALTIME ECOTS_SD_FSVersion ECOTS_SD_ECOTSREV ECOTS_SD_TEMPERATURE ECOTS_SD_PartNumber)'

//var newPool = []
const testerPool = [
  '10.71.200.178', '10.71.200.170', '10.71.200.176', '10.71.200.171',
  '10.71.200.79', '10.71.200.173', '10.71.200.172', '10.71.200.180',
  '10.71.200.185', '10.71.200.150', '10.71.200.135', '10.71.200.167',
  '10.71.200.175', '10.71.200.151', '10.71.200.119', '10.71.200.179',
  '10.71.200.156', '10.71.200.72', '10.71.200.154', '10.71.200.61',
  '10.71.200.145', '10.71.200.148', '10.71.200.160', '10.71.200.155',
  '10.71.200.165', '10.71.200.143', '10.71.200.51', '10.71.200.144',
  '10.71.200.149', '10.71.200.197', '10.71.200.163', '10.71.200.157',
  '10.71.200.200', '10.71.200.168', '10.71.200.111', '10.71.200.125',
  '10.71.200.74', '10.71.200.86', '10.71.200.54', '10.71.200.136',
  '10.71.200.174', '10.71.200.142', '10.71.200.60', '10.71.200.166',
  '10.71.200.198', '10.71.200.146', '10.71.200.64', '10.71.200.90',
  '10.71.200.138', '10.71.200.63', '10.71.200.49', '10.71.200.101',
  '10.71.200.57', '10.71.200.77', '10.71.200.71', '10.71.200.97',
  '10.71.200.103', '10.71.200.104', '10.71.200.117', '10.71.200.80',
  '10.71.200.66', '10.71.200.67', '10.71.200.52', '10.71.200.95',
  '10.71.200.69', '10.71.200.114', '10.71.200.183', '10.71.200.189',
  '10.71.200.188', '10.71.200.196', '10.71.200.99', '10.71.200.112',
  '10.71.200.193', '10.71.200.115', '10.71.200.137', '10.71.200.82',
  '10.71.200.187', '10.71.200.186', '10.71.200.83', '10.71.200.73',
  '10.71.200.195', '10.71.200.98', '10.71.200.105', '10.71.200.110',
  '10.71.200.192', '10.71.200.113', '10.71.200.109', '10.71.200.78',
  '10.71.200.62', '10.71.200.65', '10.71.200.118', '10.71.200.190',
  '10.71.200.169', '10.71.200.84', '10.71.200.164', '10.71.200.89',
  '10.71.200.116', '10.71.200.184', '10.71.200.140', '10.71.200.139',
  '10.71.200.152', '10.71.200.153', '10.71.200.141', '10.71.200.191',
  '10.71.200.59' ]


sweep()
setInterval( sweep, 10*60*1000 )

function sweep(){
for ( var ip of testerPool ) {

(function(adv){

var connection = new telnet();
var params = {
  host: adv,
  port: 23,
	username:'kei',
	password:'keiuser',
  shellPrompt: '$',
  timeout: 2000,
};
connection.on('ready', function(prompt) {
  connection.exec(cmd, function(err, response) {
		var json = {HOST: params.host}

		if ( response ){
			var lines = response.split('\n')
			for ( var line of lines ) {
				if ( line ) {
						var fdArr = line.replace(' ','|').split('|')
					json[fdArr[0]] = fdArr[1]
				}
			}
		}
		connection.end();
    console.log(json)

		if ( json.ECOTS_SD_PartNumber ) {
			client.hmset( 'PART:'+json.ECOTS_SD_PartNumber, 
										'PROGRAM', json.ECOTS_SD_PROGRAMNAME,
										json.HOST+':'+json.ECOTS_SD_LOTNUMBER_AND_CURTIME, JSON.stringify( json) )
		}


  });

  //newPool.push( adv )

});
 
connection.on('timeout', function() {
  console.log(params.host + ' >> ' + 'socket timeout!')
  connection.end();
});
 
connection.on('error', function(msg) {
  console.log(params.host + ' >> ' + msg)
});

connection.on('close', function() {
//console.log(params.host + ' >> ' + 'connection closed');
//console.log( newPool )
});
 
connection.connect(params);

})(ip)
}
}
 

