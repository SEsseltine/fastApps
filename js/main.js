var inputType = "string";
var stepped = 0, rowCount = 0, errorCount = 0, firstError;
var start, end;
var firstRun = true;
var data;
google.charts.load('current', {'packages':['table']});

accounting.settings = {
	currency: {
		symbol : "$",   // default currency symbol is '$'
		format: {
            pos : "%s%v",   // for positive values, eg. "$ 1.00" (required)
            neg : "(%s%v)", // for negative values, eg. "$ (1.00)" [optional]
            zero: "%s-- "  // for zero values, eg. "$  --" [optional]
        },
		decimal : ".",  // decimal point separator
		thousand: ",",  // thousands separator
		precision : 2   // decimal places
	},
	number: {
		precision : 0,  // default precision on numbers is 0
		thousand: ",",
		decimal : "."
	}
}


function parseFile(){
    // flag the first run or add a console break
    if (!firstRun)
        console.log("--------------------------------------------------");
    else
        firstRun = false;

    // Parse local CSV file
    Papa.parse(document.getElementById('files').files[0], {
        delimiter: "",	// auto-detect
        newline: "",	// auto-detect
        quoteChar: '"',
        escapeChar: '"',
        header: document.getElementById('header').checked,
        transformHeader: undefined,
        dynamicTyping: true,
        preview: 0,
        encoding: "",
        worker: false,
        comments: false,
        step: undefined,
        complete: function(results, file) {
            data = results['data'];
            return removeIdenticals();
        },
        error: undefined,
        download: false,
        downloadRequestHeaders: undefined,
        skipEmptyLines: document.getElementById('skipEmptyLines').checked,
        chunk: undefined,
        fastMode: undefined,
        beforeFirstChunk: undefined,
        withCredentials: undefined,
        transform: undefined,
        delimitersToGuess: [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP]
	});

}

function removeIdenticals(){

    var i = 0, x;
    while(i < data.length - 1){
        x = i + 1;
        while(x < data.length){
            if(data[i]["INV_ITEM_ID"] == data[x]["INV_ITEM_ID"] &&
                data[i]["QTY_BASE"] == data[x]["QTY_BASE"]*-1){
                data.splice(x,1);
                data.splice(i,1);
                x = i + 1;

            }else{
                x++;
            }
        }
        i++;
    }
    if(document.getElementById('combineLikeParts').checked) combineLikeParts();
    else genTable();
}

function combineLikeParts(){
    data.sort(function(a,b){
        a = a['INV_ITEM_ID'], b = b['INV_ITEM_ID'];
        if(isNumber(a) && isNumber(b)) return a > b ? 1 : -1;
        if(isNumber(a)) return 1;
        if(isNumber(b)) return -1;
        return a.localeCompare(b);
    });

    var i = 0, x;
    while(i < data.length - 1){
        x = i + 1;
        while(x < data.length && data[i]["INV_ITEM_ID"] == data[x]["INV_ITEM_ID"]){
            data[i]["QTY_BASE"] += data[x]["QTY_BASE"];
            var temp_dol_one = accounting.unformat(data[i]["MONETARY_AMOUNT"]);
            var temp_dol_two = accounting.unformat(data[x]["MONETARY_AMOUNT"]);
            temp_dol_one += temp_dol_two;
            data[i]["MONETARY_AMOUNT"] = accounting.formatMoney(temp_dol_one);
            data.splice(x,1);
        }
        if(data[i]["QTY_BASE"] == 0 || data[i]["MONETARY_AMOUNT"] == 0){
            if(i == 0) data.pop();
            else data.splice(i,1);
        }
        i++;
    }
    genTable();
}

function isNumber(x){
    return !isNaN(x);
}

function genTable(){
    var _data = new google.visualization.DataTable();
    _data.addColumn('string', 'Business Unit');
    _data.addColumn('string', 'Description');
    _data.addColumn('string', 'Part #');
    _data.addColumn('number', 'Amount Change');
    _data.addColumn('number', 'Monetary Change');
    for(var x = 0; x < data.length; x++){
        _data.addRows([
          [data[x]['BUSINESS_UNIT'],
            data[x]['DESCR60'],
            data[x]['INV_ITEM_ID'].toString(),
            data[x]['QTY_BASE'],
            {v:accounting.unformat(data[x]['MONETARY_AMOUNT']),
            f: data[x]['MONETARY_AMOUNT']}]
        ]);
    }


    var table = new google.visualization.Table(document.getElementById('table'));

    table.draw(_data, {width: '100%', height: '100%'});

    document.getElementById('download-button').disabled = false
}

function run(){

    parseFile();

}

function download(){
    var csv = Papa.unparse(data);
    var csvData = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    var csvURL =  null;
    if (navigator.msSaveBlob)
    {
       csvURL = navigator.msSaveBlob(csvData, 'download.csv');
    }
    else
    {
       csvURL = window.URL.createObjectURL(csvData);
    }

    var tempLink = document.createElement('a');
    tempLink.href = csvURL;
    tempLink.setAttribute('download', 'cycle_cleaner.csv');
    tempLink.click();
}

function updateFileText(){
    document.getElementById("fileLabel").textContent = document.getElementById("files").files[0].name
}