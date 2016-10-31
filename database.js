module.exports = {
save: save
}

//var head = '^[tw]'
//	product = '[0-9a-z]{6}',
//	flow = '(af|fh|sh)',
//	rev = '[0-9a-z]{2}',
//	subrev = '[0-9a-z]{2}(en[0-9a-z])?',
//	hardware = '[0-9]{3}[a-z]',
//	regPat = new RegExp(head + product + flow + rev + subrev + '_' + hardware),
//	oldRegpat = new RegExp(head + product + flow + rev + '_' + subrev);


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

		// TCR info per TE
		client.sadd("TE", tcrJson.TE);

		if (tcrJson.STAGE.includes('Cancel') || tcrJson.STAGE.includes('Closed')) {
				client.hdel('<' + tcrJson.TE + '>', tcrJson.TCR)
		} else {
				var desc = [tcrJson.CATEGORY, tcrJson.PE, tcrJson.PRODUCT.trim() || '[PKG]', tcrJson.MEMORY, tcrJson.NUM_OF_DIE, tcrJson.START || '[START]', tcrJson.COMMIT || '[COMMIT]', tcrJson.STAGE]
				client.hset(tcrJson.QUEUE, tcrJson.TCR, desc.join(' | '));
				if (tcrJson.TE && (tcrJson.QUEUE !== '<' + tcrJson.TE + '>')) {
					client.hdel('<' + tcrJson.TE + '>', tcrJson.TCR)
				}
		}

		// group info
		client.sadd ( 'MEMORY:'+tcrJson.MEMORY , tcrJson.TCR )
		client.sadd ( 'STAGE:' +tcrJson.STAGE  , tcrJson.TCR )
		if ( tcrJson.AGILE ) {
		  client.sadd ( 'AGILE:' +tcrJson.AGILE  , tcrJson.TCR )
		}
		if ( tcrJson.TESTER ) {
			client.sadd ( 'TESTER:'+tcrJson.TESTER , tcrJson.TCR    )
		}
		if ( tcrJson.PDT ) {
			client.sadd ( 'PDT:'   +tcrJson.PDT , tcrJson.TCR )
		}
		if (tcrJson.WAFER ) {
			client.sadd ( 'WAFER:' +tcrJson.WAFER  , tcrJson.TCR    )
		}

		if ( tcrJson.PROGRAM ) {
			const smallPro = tcrJson.PROGRAM.trim().toLowerCase()
			switch( tcrJson.CATEGORY ) {
        case 'MT':
          var baseProName = smallPro.substr(0,7)
					var key = 'PRO:'+tcrJson.CATEGORY+':'+baseProName
					var field = smallPro+':'+tcrJson.TCR
          client.hset ( key, field, tcrJson.OUT_PRO||''  )
          break;
        case 'KGD':
          var baseProName = tcrJson.PROGRAM.substr(0,10).trim()
          if ( baseProName.match(/^[0-9a-zA-Z]+$/) ) {
						var key = 'PRO:'+tcrJson.CATEGORY+':'+baseProName
            client.hset ( key, tcrJson.TCR, tcrJson.OUT_PRO||''  )
          }
					break;
        case 'BI':
          var baseProName = tcrJson.PROGRAM.substr(0,6).trim()
					var key = 'PRO:'+tcrJson.CATEGORY+':'+baseProName
          client.hset ( key, tcrJson.TCR, tcrJson.OUT_PRO||''  )
          break;
        default:
          break;
			}
		}

		// link TE and PE
		if ( tcrJson.TE && tcrJson.PE ) {
			client.hset ( tcrJson.TE, tcrJson.TCR, tcrJson.PE )
			client.hset ( tcrJson.PE, tcrJson.TCR, tcrJson.TE )
      if ( tcrJson.PE2 ) {
        client.hset ( tcrJson.TE, tcrJson.TCR, tcrJson.PE2 )
        client.hset ( tcrJson.PE2, tcrJson.TCR, tcrJson.TE )
      }
		}
}
