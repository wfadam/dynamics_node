module.exports = {
save: save
}

function save(client, tcrJson){

		// save TCR body
		var fdArr = []
		for (var key in tcrJson) {
			fdArr.push(key)
			fdArr.push(tcrJson[key])
		}
		client.hmset(tcrJson.TCR, fdArr);

		// TCR info per PE
		client.sadd("PE", tcrJson.PE);
		var desc = [tcrJson.CATEGORY, tcrJson.STAGE, tcrJson.AGILE.trim() || '[AGILE]', tcrJson.PDT.trim() || '[PDT]', tcrJson.PRODUCT.trim() || '[PKG]', tcrJson.MEMORY, tcrJson.NUM_OF_DIE, tcrJson.TE || 'XMAN']
		//client.hset(tcrJson.PE, tcrJson.TCR, desc.join(' | '));

		// TCR info per TE
		client.sadd("TE", tcrJson.TE || 'XMAN');
		desc = [tcrJson.CATEGORY, tcrJson.STAGE, tcrJson.START || '[START]', tcrJson.END || '[END]', tcrJson.COMMIT || '[COMMIT]', tcrJson.PRODUCT.trim() || '[PKG]', tcrJson.MEMORY, tcrJson.NUM_OF_DIE, tcrJson.PE, tcrJson.OUT_PRO]
		//client.hset(tcrJson.TE, tcrJson.TCR, desc.join(' | '));
		client.hset(tcrJson.QUEUE, tcrJson.TCR, desc.join(' | '));
		if (tcrJson.TE && (tcrJson.QUEUE !== '<' + tcrJson.TE + '>')) {
			console.log('Removed ' + tcrJson.TCR + ' from ' + '<' + tcrJson.TE + '>')
				client.hdel('<' + tcrJson.TE + '>', tcrJson.TCR, function() {})
		}

		// group info
		if ( tcrJson.AGILE ) {
			client.sadd ( 'AGILE:' +tcrJson.AGILE , tcrJson.TCR   ) 
			client.sadd ( 'AGILE'                 , tcrJson.AGILE ) 
		}
		if ( tcrJson.TESTER ) {
			client.sadd ( 'TESTER:'+tcrJson.TESTER , tcrJson.TCR    ) 
			client.sadd ( 'TESTER'                 , tcrJson.TESTER ) 
		}
		if ( tcrJson.PDT ) {
			client.sadd ( 'PDT:'   +tcrJson.PDT , tcrJson.TCR ) 
			client.sadd ( 'PDT'                 , tcrJson.PDT ) 
		}
		client.sadd ( 'MEMORY:'+tcrJson.MEMORY , tcrJson.TCR    ) 
		client.sadd ( 'MEMORY'                 , tcrJson.MEMORY ) 
		client.sadd ( 'STAGE:' +tcrJson.STAGE  , tcrJson.TCR    ) 
		if (tcrJson.WAFER ) {
			client.sadd ( 'WAFER:' +tcrJson.WAFER  , tcrJson.TCR    ) 
		}

		// link program name to pops
		if ( tcrJson.OUT_PRO && tcrJson.PROGRAM ) {
			switch( tcrJson.CATEGORY ) {
				case 'MT':
					var baseProName = tcrJson.PROGRAM.substr(0,7).toLowerCase()
					client.hset ( 'PRO:'+tcrJson.CATEGORY+':'+baseProName, tcrJson.TCR, tcrJson.OUT_PRO  )
					break;
				default:
					client.hset ( 'PRO:'+tcrJson.CATEGORY+':'+tcrJson.PROGRAM, tcrJson.TCR, tcrJson.OUT_PRO  )
					break;
			}
		}

		// link TE and PE
		if ( tcrJson.TE && tcrJson.PE ) {
			client.hset ( tcrJson.TE, tcrJson.TCR, tcrJson.PE, function(){}  )
			client.hset ( tcrJson.PE, tcrJson.TCR, tcrJson.TE, function(){}  )
		}
}
