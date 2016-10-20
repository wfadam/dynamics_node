var Nightmare = require('nightmare'),
    nightmare = new Nightmare({
        waitTimeout: 45000 // in ms
    });

module.exports = {
    toJson: toJson
}

function toJson(url) {
    return nightmare
        //.viewport(1600,1200)
        .goto(url)
        .wait(5000)
        //.screenshot('abc.png')
        .evaluate(function() {
            $('#contentIFrame0').contents().find('.ms-crm-div-NotVisible').remove();

            const iframe = document.getElementById('contentIFrame0').contentDocument;
            const find = function(id) {
                return iframe.getElementById(id);
            };

            var tcr = {}
            tcr.PRODUCT = '';
            tcr.TESTER = '';

            tcr.TCR = find('TCR Number_label').textContent.trim();
            tcr.STAGE = find('Stage_label').textContent.trim();
            tcr.TE = find('header_process_zsd_assignedte_lookupValue').title.trim();
            tcr.PE = find('createdby_lookupValue').title.trim();
            tcr.START = find('zsd_testartdate').textContent.trim();
            tcr.STOP = find('zsd_teenddate').textContent.trim();
            tcr.PE_START = find('zsd_pestartdate').textContent.trim();
            tcr.PE_STOP = find('zsd_peenddate').textContent.trim();

            tcr.CATEGORY = find('Category_label').textContent.trim();
            if (tcr.CATEGORY === "KGD") {
                tcr.NUM_OF_DIE = '';
                tcr.PRODUCT = '';
                tcr.PE2 = find('zsd_assignedsdsste_lookupValue').title.trim(); // local PE in charge of checkout
                return tcr;
            } 

	    if (tcr.CATEGORY === "MT") {
		    tcr.PRODUCT = find('Product Desc (Pkg,Prod,Perf,IO Ch,MLC/SLC)_label').title.trim();
		    tcr.TESTER = find('zsd_hardware1_lookupValue').title.trim();
	    } else if (tcr.CATEGORY === "BI") {
		    tcr.PRODUCT = find('Request Description_label').title.trim();
		    tcr.TESTER = find('Tester/Platform_label').textContent.trim();
	    }

	    tcr.NUM_OF_DIE = find('Number of Die/CE_label').textContent.trim();
            tcr.PDT = find('zsd_pdtproject_lookupValue').title.trim();
            tcr.PROGRAM = find('Test Program Name_label').textContent.trim();
            tcr.MEMORY = find('zsd_memoryconfiguration_lookupValue').title.trim();
            tcr.AGILE = find('zsd_agileproductline_lookupValue').textContent.trim();
            tcr.COMMIT = find('Revised Program Commit Date_label').textContent.trim();
            tcr.REQUEST = find('Details/Comments_label').title.trim();
            tcr.COMMENT = find('Comments_label').title.trim();
            tcr.OUT_PRO = find('header_process_zsd_sourcecodelink').textContent.trim();
            tcr.RELEASE = find('Release Type_label').textContent.trim();
            tcr.REASON = find('zsd_deferreason_i').title.trim();


            return tcr
        })
        .end()
        .then(function(result) {
            return result
        }).catch(function(e) {
            throw new Error(e)
        })
}
