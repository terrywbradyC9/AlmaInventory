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

//If you choose to compute stats by LC Class, the following will be used
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

//Loop through the spreadsheets listed in the stats spreadsheet
//If the status field is empty, attempt to process the specified folder
function gatherStats() {
  var lock = LockService.getDocumentLock();
  if (lock.tryLock(1)){
    //Use first sheet as a driver for work to be performed
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    setStatusCols(sheet, STATSCOLS, COMPCOL);

    //If a ByCallNum sheet is present, determine column stats
    var lcsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ByCallNum");
    if (lcsheet != null) {
      setStatusCols(lcsheet, LCSTATSCOLS, LCCOMPCOL)
    }

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
    lock.releaseLock();
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
    if (lcsheet != null) {
      removeLcStats(lcsheet, folderid);
    }

    cols[STATCOL]="";

    //Determine if LC Class level stats should be computed
    var lcmap = (lcsheet != null) ? {} : null;

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
    if (lcsheet != null) {
      writeLcStats(lcsheet, lcmap);
    }
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
      increment(STATSCOLS, cols, stat);
      if (lcmap != null) {
        lcincrement(folderid, lcmap, calldata[i][0], stat);
      }
    }
  } catch(e) {
    cols[STATCOL] = e;
    return false;
  }
  cols[STATCOL]="Updated "+ Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH:mm:ss');
  return true;
}
