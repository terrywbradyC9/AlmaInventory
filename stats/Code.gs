/**
Google Sheet Code to compute status for a collection of inventory runs
Column Headers
  Google Drive FolderId
  Status (clear to recompute)
  Folder name
  File Count
  Record Count

The following column names should correspond to the status values from the Alma Inventory tool
Note: Dashes and Underbars will be normalized to spaces
  PASS
  FAIL
  NOT FOUND
  META CALL
  META TTL
  META VOL
  PULL STAT
  PULL LOC
  PULL SUPP
  PULL HSUPP
  PULL DUE
  PULL MULT

Catch all counter for any values that do not match
  Other
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Gather Stats", "gatherStats")
    .addToUi();
}

//This array will map stats values to column indicies
var STATSCOLS = {};
var LCSTATSCOLS = {};

//The number of header rows to ignore
var HROWS = 1;

var FOLDERCOL=0;  //Google drive id for the folder to query
var STATCOL = 1;  //Status field.  Set to null to force a re-computation
var TITLECOL = 2; //name of the Google Drive folder
var FILECOL = 3;  //Count of the number of Google sheet inventory files processed
var RECCOL = 4;   //Count of the number of records counted from each file
var COMPCOL = 5;  //Starting index for the computed column values

var LCRECCOL = 2;  //Count of the number of records counted from each file
var LCCOMPCOL = 2;  //Starting index for the computed column values

//Column numbers from inventory files - verify these columns to determine if a file is an inventory file
var FILE_STAT_COL = 11;   //Status column
var FILE_BARCODE_COL = 1; //Barcode colum
var FILE_CALLNO_COL = 3; //Call number colum
var OTHER = "Other";

//Read first row of the inventory stats file to set column indicies for each status value
function setStatusCols(sheet, colstats, compcol) {
  if (sheet == null) return;
  var colcount = sheet.getLastColumn();
  var hrange = sheet.getRange(1, 1, 1, colcount);
  var hdata = hrange.getValues();
  for(var i=compcol; i<colcount; i++) {
    var s = hdata[0][i].toString().replace(/[-_]/g," ");
    if (s != "") {
      colstats[s] = i;
    }
  }
}

//Increment the counter for a specific status value.
//If the status is not found. log a message and increment "Other"
function increment(colstats, cols, stat) {
  if (stat == "") return;
  stat = stat.toString().replace(/[-_]/g," ");
  if (stat in colstats) {
    var index = colstats[stat];
    cols[index]++;
  } else {
    if (OTHER in colstats) {
      var index = colstats[OTHER];
      cols[index]++;
    }
    Logger.log("Unexpected Stat: "+stat);
  }
}

//Increment the counter for a specific status value for an LC class.
//Create a record if a new LC class is discovered
function lcincrement(folderid, lcmap, lcclass, stat) {
  var lccols = [];
  if (lcclass in lcmap)  {
    lccols = lcmap[lcclass];
  } else {
    lccols[0] = folderid;
    lccols[1] = lcclass;
    for(var k in LCSTATSCOLS){
      lccols[lccols.length] = 0;
    }
    lcmap[lcclass] = lccols;
  }
  lccols[LCRECCOL]++;
  increment(LCSTATSCOLS, lccols, stat);
}

function writeLcStats(lcsheet, lcmap) {
  if (lcsheet == null) return;
  var keys = [];
  for(var k in lcmap) {
    keys.push(k);
  }
  keys = keys.sort();
  var arr = [];
  for(var i=0; i<keys.length; i++) {
    arr.push(lcmap[keys[i]]);
  }
  if (arr.length == 0) return;
  lcsheet.insertRows(2, arr.length);
  var range = lcsheet.getRange(2, 1, arr.length, arr[0].length);
  range.setValues(arr);
}


//Clear prior computed LC stats for a parent folder
function removeLcStats(lcsheet, folderid) {
  if (lcsheet == null) return;
  if (lcsheet.getLastRow() <= 1) return;
  var range = lcsheet.getRange(2, FOLDERCOL+1, lcsheet.getLastRow()-1, 1);
  var data = range.getValues();
  var rstart = -1;
  var rcount = 0;
  for(var r=0; r<data.length; r++){
    if (data[r][0]==folderid) {
      rstart = (rcount == 0) ? r+2 : rstart;
      rcount++;
    } else if (rcount > 0) {
      lcsheet.deleteRows(rstart, rcount);
      rstart = -1;
      rcount = 0;
    }
  }
  if (rcount > 0) {
    lcsheet.deleteRows(rstart, rcount);
  }
}


//Loop through the spreadsheets listed in the stats spreadsheet
//If the status field is empty, attempt to process the specified folder
function gatherStats() {
  //Use first sheet as a driver for work to be performed
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  setStatusCols(sheet, STATSCOLS, COMPCOL);

  //If a ByCallNum sheet is present, determine column stats
  var lcsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ByCallNum");
  setStatusCols(lcsheet, LCSTATSCOLS, LCCOMPCOL)

  var colcount = sheet.getLastColumn();
  var range = sheet.getRange(1+HROWS, 1, sheet.getLastRow()-1, colcount);
  var data = range.getValues();
  for(var r=0; r<data.length; r++) {
    var cols = data[r];
    var folder = cols[FOLDERCOL];
    var fstat = cols[STATCOL];
    if (folder != "" && fstat=="") {
      var rowRange = sheet.getRange(r+1+HROWS, 1,1, colcount);
      processFolder(sheet, rowRange, lcsheet);
    }
  }
}

//Process a specific folder
// - set the status to processing
// - iterate through the list of files
// - if a file is an inventory file, update statitics counts
function processFolder(sheet, range, lcsheet) {
  var data = range.getValues();
  var cols = data[0];
  for(var i=FILECOL; i<sheet.getLastColumn(); i++) {
    cols[i]=0;
  }

  try {
    var folderid = cols[FOLDERCOL];
    var folder = DriveApp.getFolderById(folderid);
    cols[TITLECOL] = folder.getName();
    var files = folder.getFiles();
    cols[STATCOL]="Processing ...";
    range.setValues(data).setBackground("gray").setFontColor("red");
    SpreadsheetApp.flush();
    removeLcStats(lcsheet, folderid);

    cols[STATCOL]="";
    var lcmap = {};
    while(files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() != "application/vnd.google-apps.spreadsheet"){
        continue;
      }
      if (!processFile(folderid, file, cols, lcmap)) {
        break;
      }
    }
    range.setValues(data).setBackground("white").setFontColor("black");
    writeLcStats(lcsheet, lcmap);
    SpreadsheetApp.flush();
  } catch(e) {
    Logger.log(e);
    cols[STATCOL]=e;
    range.setValues(data).setBackground("white").setFontColor("black");
    SpreadsheetApp.flush();
    return;
  }
}

//Read the header show of a spreadsheet.
//If the file appears to be an inventory file, iterate through the rows of the spreadsheet and update counts.
function processFile(folderid, file, cols, lcmap) {
  try {
    var isheet = SpreadsheetApp.open(file).getActiveSheet();
    //Verify that the column arrangement is as expected
    //If so, query the status field for each record

    //Logger.log("Processing "+ file.getName());
    if (isheet.getLastColumn() < FILE_STAT_COL) {
      //file is ignored.  Do not treat as an error.
      Logger.log(file.getName() + " is not an inventory file");
      return true;
    }
    var header = isheet.getRange(1, 1, 1, isheet.getLastColumn());
    var hdata = header.getValues()[0];

    if ((hdata[FILE_STAT_COL-1] != "Status") ||
        (hdata[FILE_CALLNO_COL-1] != "Call Number") ||
        (hdata[FILE_BARCODE_COL-1] != "Barcode")) {
      //file is ignored.  Do not treat as an error.
      Logger.log(file.getName() + " is not an inventory file");
      return true;
    }
    cols[FILECOL]++;
    var range = isheet.getRange(2, FILE_STAT_COL, isheet.getLastRow()-1, 1);
    var callrange = isheet.getRange(2, FILE_CALLNO_COL, isheet.getLastRow()-1, 1);
    var data = range.getValues();
    var calldata = callrange.getValues();
    for(var i=0; i<data.length; i++) {
      cols[RECCOL]++;
      var stat = data[i][0];
      var lcclass = calldata[i][0].replace(/^([A-Z]+).*$/,"$1");
      lcclass = (lcclass.length > 3) ? "Other" : lcclass;
      increment(STATSCOLS, cols, stat);
      try {
        lcincrement(folderid, lcmap, lcclass, stat);
      } catch(e) {
        Logger.log(e);
      }
    }
  } catch(e) {
    cols[STATCOL] = e;
    return false;
  }
  cols[STATCOL]="Updated "+ Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH:mm:ss');
  return true;
}
