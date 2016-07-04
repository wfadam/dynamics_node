"use strict";

var phantom = require('phantom');
var url = ''
var sitepage = null;
var phInstance = null;


var redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
    console.log("Error " + err);
});

client.blpop('outQueue', 5, function(err, value) {

    if (value === null) {
        console.log('time out')
            //throw new Error( 'Time out' )
        client.quit()
        return;
    }

    console.log(value[1])

    url = value[1].trim()
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
        //.then(status => {
        //    console.log(status);
        //
        //    faceOff()
        //    sitepage.render('w.png');
        //})
        .then(status => {
            getBrief()
        })
        .catch(error => {
            console.log(error);
            phInstance.exit();
        });
})

console.log("waiting new jobs")


function faceOff() {
    sitepage.evaluate(function() {
        $('#InlineDialog_Background').hide()
        $('#InlineDialog').hide()
        console.log('Say goodbye to the lady')
    })
}

function enablePageConsole(page) {
    page.on('onConsoleMessage', function(msg) {
        console.log(msg);
    })
}

function getBrief() {
    sitepage.evaluate(function() {

        var valueOf = function(id) {
            var doc = document.getElementById('contentIFrame0').contentDocument
            var ele = doc.getElementById(id)
            if (ele) {
                if (ele === 'zsd_productdescription') {
                    return ele.title.trim()
                } else {
                    return ele.innerText.trim()
                }
            }
            return ''
        }

        var fmt = function(name, val) {
            return name + '\t:\t' + val
        }

        var tcr = {}
        tcr.TE      = valueOf('zsd_assignedte_d')
        tcr.STAGE   = valueOf('zsd_stage')
        tcr.START   = valueOf('zsd_testartdate')
        tcr.END     = valueOf('zsd_teenddate')
        tcr.COMMIT  = valueOf('header_process_zsd_commitdate')
        tcr.TITLE   = valueOf('zsd_tcrrequestname')
        tcr.PKG     = valueOf('zsd_productdescription')
        tcr.AGILE   = valueOf('zsd_agileproductline')
        tcr.KBM     = valueOf('zsd_category')
        tcr.PROD    = valueOf('zsd_releasetype')
        tcr.FLOW    = valueOf('zsd_testtimetestflow')
        tcr.TCR     = valueOf('header_zsd_tcrnumber')
        tcr.PROG    = valueOf('header_zsd_testprogamname')
        tcr.PE      = valueOf('createdby')
        tcr.OUT_PRO = valueOf('header_process_zsd_executablelink')
        tcr.REQUEST = valueOf('zsd_detailscomments')
        tcr.COMMENT = valueOf('zsd_tecomments')

        return tcr
    }).then(function(tcrJson) {

        sitepage.close()
        phInstance.exit()

        tcrJson.URL = url
        console.log(JSON.stringify(tcrJson, null, 2))

        var fdArr = []
        for (var key in tcrJson) {
            fdArr.push(key)
            fdArr.push(tcrJson[key])
        }
        client.hmset(tcrJson.TCR, fdArr, redis.print);

        // TCR count per PE
        client.sadd("PE", tcrJson.PE, redis.print);
        var desc = [tcrJson.KBM, tcrJson.STAGE, tcrJson.PKG || '[PKG]', tcrJson.TITLE, tcrJson.TE || 'XMAN']
        client.hset(tcrJson.PE, tcrJson.TCR, desc.join(' | '), redis.print);


        // TCR count per TE
        client.sadd("TE", tcrJson.TE || 'XMAN', redis.print);
        desc = [tcrJson.STAGE, tcrJson.START || '[START]', tcrJson.END || '[END]', tcrJson.COMMIT || '[COMMIT]', tcrJson.PKG || '[PKG]', tcrJson.TITLE, tcrJson.PE]
        client.hset(tcrJson.TE || 'XMAN', tcrJson.TCR, desc.join(' | '), redis.print);

        client.quit();
    })

}
