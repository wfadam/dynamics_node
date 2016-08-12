var Nightmare = require('nightmare'),
    nightmare = new Nightmare({
					waitTimeout: 45000 // in ms
				});

module.exports = {
	toJson: toJson
}

function toJson( url ) {
return nightmare
  .goto(url)
  .wait()
	.evaluate(function() {
        var doc = $('#contentIFrame0').contents();

        function valueOf(id) {
            switch (id) {
                case '#zsd_detailscomments span':
								case '#zsd_tecomments span':
                    return doc.find(id).html() || ''
                default:
                    return doc.find(id).text() || ''
            }
        }
        var tcr = {}
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
				//return $('#contentIFrame0').contents().find('#zsd_assignedsdsste span.ms-crm-Lookup-Item-Read').html()//a8w4db
	})
.end()
	.then(function(result) {
			return result
			}).catch(function(e){
					throw new Error(e)
				})
}

