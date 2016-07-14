"use strict";

var phantom = require('phantom');
var url = 'http://dynamics.sandisk.com/Dynamics/main.aspx'

var sitepage = null;
var phInstance = null;
var redis = require("redis"),
    client = redis.createClient(6379, 'mtte');

client.on("error", function(err) {
    console.log("Error " + err);
});


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
        //console.log(status);

        if (status !== 'success') {
            console.log('Failed to load sitepage')
            sitepage.close()
            phInstance.exit()
        }

        //sitepage.render('w.png');

        setTimeout(function() {

            faceOff()
            //sitepage.render('w2.png');

            dropDown()
            setTimeout(function() {
                //sitepage.render('w3.png');

                openTCRRequest()
                setTimeout(function() {

                    //searchTCR( '*10861' )
                    setTimeout(function() {

                        //sitepage.render('w4.png');

                        getQueue(false)

                    }, 2000)
                }, 2000)
            }, 2000)
        }, 2000)

    })
    .catch(error => {
        console.log(error);
        phInstance.exit();
    });


function faceOff() {
    sitepage.evaluate(function() {
        $('#InlineDialog_Background').hide()
        $('#InlineDialog').hide()
        //console.log('Say goodbye to the lady')
    })
}

function dropDown() {
    sitepage.evaluate(function() {
        $('#TabTEST').click()
        //console.log('Drop down the list')
    })
}

function openTCRRequest() {
    sitepage.evaluate(function() {
        $('#zsd_tcrrequest').click()
        //console.log('Click the TCR REQUEST')
    })
}


function getQueue(withinQueue) {
    if (withinQueue === null || typeof withinQueue !== 'boolean') {
        console.log('Need to input true if querying the Queue')
        phInstance.exit()
    }
    sitepage.evaluate(function(wiQ) {
            var tcrArr = []
            var tcrRows = wiQ
			? $('#contentIFrame0').contents().find("tr.ms-crm-List-Row[oid][otype]")
			: $('#contentIFrame1').contents().find("tr.ms-crm-List-Row[oid][otype]")

            console.log('Found ' + tcrRows.length + (wiQ ? ' in the Queue' : ' in the 1st page of TCR Request'))
            for (var i = 0; i < tcrRows.length; i++) {
                var otype = tcrRows[i].attributes['otype'].value
                var oid = tcrRows[i].attributes['oid'].value

		var fields = jQuery(tcrRows[i]).find('td')
		var modT = fields[1].textContent
		var tcrN = fields[2].textContent
		var qName = fields[5].textContent
		tcrArr.push( [ tcrN, modT, qName, otype, oid ].join(',') )

            }

            return tcrArr
        }, withinQueue)
        .then(function(tcrArr) {

            sitepage.close()
            phInstance.exit()

            //console.log(tcrArr)

            if ( tcrArr.length > 0 ) {
                client.rpush('inQueue', tcrArr, redis.print);
            }
            client.quit();
        })

}

function searchTCR(tcrN) {
    if (tcrN === null || (typeof tcrN) !== 'string') {
        console.log('Need a string as TCR number for searching')
        phInstance.exit();
    }

    sitepage.evaluate(function(tn) {
        $('#contentIFrame1').contents().find('#crmGrid_findCriteria').val(tn)
        $('#contentIFrame1').contents().find('#crmGrid_findCriteriaImg').click()
    }, tcrN)
}


function enablePageConsole(page) {
    page.on('onConsoleMessage', function(msg) {
        console.log(msg);
    })
}
