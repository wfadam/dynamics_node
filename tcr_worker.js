"use strict";

var phantom = require('phantom');
var url = ''
var sitepage = null;
var phInstance = null;
var math = require('mathjs')


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
            console.log(status);
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

        var ifrDoc = $('#contentIFrame0').contents()

        function valueOf(id) {
		switch( id ) {
		case 'createdby':
		case 'zsd_assignedte_d':
		case 'zsd_agileproductline':
		case 'zsd_stagestatus':
		case 'zsd_pdtproject':
			return document.getElementById('contentIFrame0').contentDocument.getElementById(id).innerText.trim()
		default:
			return ifrDoc.find('#' + id).text().trim()
		}
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
        tcr.STATUS  = valueOf('zsd_stagestatus')
        tcr.PDT     = valueOf('zsd_pdtproject')
        tcr.PDT     = tcr.PDT.substring(0, tcr.PDT.length/2) // ugly but can reduce the duplicates

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
        desc = [tcrJson.KBM, tcrJson.STATUS, tcrJson.STAGE, tcrJson.START || '[START]', tcrJson.END || '[END]', tcrJson.COMMIT || '[COMMIT]', tcrJson.PKG.trim() || '[PKG]', tcrJson.TITLE, tcrJson.PE, tcrJson.OUT_PRO]
        client.hset(tcrJson.TE || 'XMAN', tcrJson.TCR, desc.join(' | '), redis.print);

        client.quit();
    })

}
