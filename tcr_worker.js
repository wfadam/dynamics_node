"use strict";

var phantom = require('phantom'),
    url = '',
    sitepage = null,
    phInstance = null,
    modT, redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
    console.log("Error " + err);
});

client.spop('outQueue', function(err, value) {

    if (value === null) {
        console.log('time out')
        client.quit()
        return;
    }

    var fdArr = value.split(',')
    modT = fdArr[1]
    var qName = fdArr[2]
    var otype = fdArr[3]
    var oid = fdArr[4]

    url = 'http://dynamics.sandisk.com/Dynamics/main.aspx?etc=' + encodeURIComponent(otype) +
        '&id=' + encodeURIComponent(oid) +
        '&newWindow=true&pagetype=entityrecord'

    phantom.create()
        .then(instance => {
            phInstance = instance;
            return instance.createPage();
        })
        .then(page => {
            sitepage = page;
            enablePageConsole(page)
            return page.open(url);
        })
        .then(status => {
            console.log(status);
            getBrief(qName)
        })
        .catch(error => {
            console.log(error);
            phInstance.exit();
        });
})


function enablePageConsole(page) {
    page.on('onConsoleMessage', function(msg) {
        console.log(msg);
    })
}

function getBrief(qNm) {
    sitepage.evaluate(function(q) {
        var doc = $('#contentIFrame0').contents();

        function valueOf(id) {
            switch (id) {
                case '#zsd_detailscomments span':
                    return doc.find(id).html() || ''
                default:
                    return doc.find(id).text() || ''
            }
        }
        var tcr = {}
        tcr.QUEUE      = q
        tcr.PRODUCT    = ''
        tcr.NUM_OF_DIE = ''
        tcr.TESTER     = ''
        tcr.PDT        = ''
        tcr.PROGRAM    = valueOf('#zsd_testprogamname span')
        tcr.MEMORY     = valueOf('#zsd_memoryconfiguration span.ms-crm-Lookup-Item-Read')
        tcr.AGILE      = valueOf('#zsd_agileproductline span.ms-crm-Lookup-Item-Read')
        tcr.WAFER      = valueOf('#MemoryConfiguration_MemoryConfiguration_zsd_memoryconfiguration_zsd_diepartnumber span.ms-crm-Lookup-Item-Read')
        tcr.COMMIT     = valueOf('#zsd_forecastdate span')
        tcr.REQUEST    = valueOf('#zsd_detailscomments span')
        tcr.PE         = valueOf('#createdby span.ms-crm-Lookup-Item-Read')
        tcr.TE         = valueOf('#zsd_assignedte span.ms-crm-Lookup-Item-Read')
        tcr.COMMENT    = valueOf('#zsd_tecomments span')
        tcr.OUT_PRO    = valueOf('#zsd_sourcecodelink span')
        tcr.RELEASE    = valueOf('#zsd_releasetype span')
        tcr.START      = valueOf('#zsd_testartdate span')
        tcr.STOP       = valueOf('#zsd_teenddate span')
        tcr.PE_START   = valueOf('#zsd_pestartdate span')
        tcr.PE_STOP    = valueOf('#zsd_peenddate span')
        tcr.TCR        = valueOf('#header_zsd_tcrnumber span')
        tcr.STAGE      = valueOf('#zsd_stage span') + '(' + valueOf('#zsd_stagestatus span') + ')'

        tcr.CATEGORY = valueOf('#zsd_category span')
        switch (tcr.CATEGORY) {
            case 'BI':
                tcr.PRODUCT = valueOf('#zsd_packagetype span')
                tcr.TESTER = valueOf('#zsd_tester span')
                break
            case 'KGD':
                tcr.FLOW = valueOf('#zsd_waferteststep span')
                tcr.PRODUCT = valueOf('#zsd_productline span')
                tcr.TESTER = valueOf('#zsd_testerplatform span') + '(' + valueOf('#zsd_tester span') + ')'
								tcr.PE2  = valueOf('#zsd_assignedsdsste span.ms-crm-Lookup-Item-Read') // local PE in charge of checkout
                break
            default:
                tcr.FLOW = valueOf('#zsd_testtimetestflow span')
                tcr.PRODUCT = valueOf('#zsd_productdescription span')
                tcr.NUM_OF_DIE = valueOf('#zsd_numberofdie :first span')
                tcr.PDT = valueOf('#zsd_pdtproject span.ms-crm-Lookup-Item-Read')
                tcr.TESTER = valueOf('#zsd_hardware1 span.ms-crm-Lookup-Item-Read')
                break
        }

        return tcr
    }, qNm).then(function(tcrJson) {

        sitepage.close()
        phInstance.exit()

        tcrJson.URL = url
        console.log(JSON.stringify(tcrJson, null, 2))

        // save TCR body
        var fdArr = []
        for (var key in tcrJson) {
            fdArr.push(key)
            fdArr.push(tcrJson[key])
        }
        client.hmset(tcrJson.TCR, fdArr, redis.print);

        // TCR info per PE
        client.sadd("PE", tcrJson.PE, redis.print);
        var desc = [tcrJson.CATEGORY, tcrJson.STAGE, tcrJson.AGILE.trim() || '[AGILE]', tcrJson.PDT.trim() || '[PDT]', tcrJson.PRODUCT.trim() || '[PKG]', tcrJson.MEMORY, tcrJson.NUM_OF_DIE, tcrJson.TE || 'XMAN']
        client.hset(tcrJson.PE, tcrJson.TCR, desc.join(' | '), redis.print);

        // TCR info per TE
        client.sadd("TE", tcrJson.TE || 'XMAN', redis.print);
        desc = [tcrJson.CATEGORY, tcrJson.STAGE, tcrJson.START || '[START]', tcrJson.END || '[END]', tcrJson.COMMIT || '[COMMIT]', tcrJson.PRODUCT.trim() || '[PKG]', tcrJson.MEMORY, tcrJson.NUM_OF_DIE, tcrJson.PE, tcrJson.OUT_PRO]
        client.hset(tcrJson.TE, tcrJson.TCR, desc.join(' | '), redis.print);
        client.hset(tcrJson.QUEUE, tcrJson.TCR, desc.join(' | '), redis.print);
        if (tcrJson.TE && (tcrJson.QUEUE !== '<' + tcrJson.TE + '>')) {
            console.log('Removed ' + tcrJson.TCR + ' from ' + '<' + tcrJson.TE + '>')
            client.hdel('<' + tcrJson.TE + '>', tcrJson.TCR, function(e2, v2) {})
        }

        // group info
        client.sadd ( 'AGILE:' +tcrJson.AGILE  , tcrJson.TCR ) 
        client.sadd ( 'PDT:'   +tcrJson.PDT    , tcrJson.TCR ) 
        client.sadd ( 'MEMORY:'+tcrJson.MEMORY , tcrJson.TCR ) 
        client.sadd ( 'TESTER:'+tcrJson.TESTER , tcrJson.TCR ) 
        client.sadd ( 'STAGE:' +tcrJson.STAGE  , tcrJson.TCR ) 
        client.sadd ( 'WAFER:' +tcrJson.WAFER  , tcrJson.TCR ) 

        client.sadd ( 'AGILE'  , tcrJson.AGILE   )
        client.sadd ( 'PDT'    , tcrJson.PDT     )
        client.sadd ( 'MEMORY' , tcrJson.MEMORY  )
        client.sadd ( 'TESTER' , tcrJson.TESTER  )

        // save TCR mod time
        client.hset("TCR_MODT", tcrJson.TCR, modT)

        client.quit();
    })

}

