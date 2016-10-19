var redis = require("redis"),
    client = redis.createClient(6379, 'mtte'),
    tcrWorker = require('./crawler.js'),
    db = require('./database.js');


function getUrl(otype, oid) {
    return 'http://dynamics.sandisk.com/Dynamics/main.aspx?etc=' + encodeURIComponent(otype) +
        '&id=' + encodeURIComponent(oid) + '&newWindow=true&pagetype=entityrecord';
    //MT:return 'http://dynamics.sandisk.com/Dynamics/main.aspx?etc=10061&id=%7B1920A2FD-0D7E-E611-80D7-005056AB451F%7D&newWindow=true&pagetype=entityrecord';
    //KGD:return 'http://dynamics.sandisk.com/Dynamics/main.aspx?etc=10061&extraqs=&histKey=635793400&id=%7b41E77CD9-7291-E611-80DC-005056AB4520%7d&newWindow=true&pagetype=entityrecord#525823172'
    //BI:return 'http://dynamics.sandisk.com/Dynamics/main.aspx?etc=10061&extraqs=&histKey=136275565&id=%7b5D59EDA8-9894-E611-80DB-005056AB451F%7d&newWindow=true&pagetype=entityrecord#750037741';
}

function parseItem(value) {
    var fdArr = value.split(',')
    return {
        modT: fdArr[1],
        qName: fdArr[2],
        otype: fdArr[3],
        oid: fdArr[4],
        url: getUrl(fdArr[3], fdArr[4])
    }
}

client.spop('outQueue', function(err, value) {

    if (value === null) {
        console.log('The out queue is empty')
        client.quit()
        return;
    }

    const items = parseItem(value)

    tcrWorker
        .toJson(items.url)
        .then(function(tcr) {
            tcr.URL = items.url
            tcr.QUEUE = items.qName
            return tcr
        })
        .then(function(tcr) {
            console.log(JSON.stringify(tcr, null, 2))
            db.save(client, tcr)
            return tcr
        })
        .then(function(tcr) {
            client.hset("TCR_MODT", tcr.TCR, items.modT)
        })
        .then(function() {
            client.quit()
        })
        .catch(function(e) {
            console.log(e)
            client.sadd('outQueue', value)
            client.quit()
        })
})
