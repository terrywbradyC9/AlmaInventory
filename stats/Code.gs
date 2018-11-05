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

//Set to the number of columns in the stats spreadsheet
var COLS = 18;
//This array will map stats values to column indicies
var STATS = {};
//The number of header rows to ignore
var HROWS = 1;

var FOLDERCOL=0;  //Google drive id for the folder to query
var STATCOL = 1;  //Status field.  Set to null to force a re-computation
var TITLECOL = 2; //name of the Google Drive folder
var FILECOL = 3;  //Count of the number of Google sheet inventory files processed
var RECCOL = 4;   //Count of the number of records counted from each file
var COMPCOL = 5;  //Starting index for the computed column values

//Column numbers from inventory files - verify these columns to determine if a file is an inventory file
var FILE_STAT_COL = 11;   //Status column
var FILE_BARCODE_COL = 1; //Barcode colum
var OTHER = "Other";

//Read first row of the inventory stats file to set column indicies for each status value
function setStatusCols(sheet) {
  COLS = sheet.getLastColumn();
  var hrange = sheet.getRange(1, 1, 1, COLS);
  var hdata = hrange.getValues();
  for(var i=COMPCOL; i<COLS; i++) {
    var s = hdata[0][i].toString().replace(/[-_]/g," ");
    if (s != "") {
      STATS[s] = i;
    }
  }
}

//Increment the counter for a specific status value.
//If the status is not found. log a message and increment "Other"
function increment(cols, stat) {
  if (stat == "") return;
  stat = stat.toString().replace(/[-_]/g," ");
  if (stat in STATS) {
    var index = STATS[stat];
    cols[index]++;
  } else {
    if (OTHER in STATS) {
      var index = STATS[OTHER];
      cols[index]++;
    }
    Logger.log(stat);
  }
}

//Loop through the spreadsheets listed in the stats spreadsheet
//If the status field is empty, attempt to process the specified folder
function gatherStats() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setStatusCols(sheet);
  var range = sheet.getRange(1+HROWS, 1, sheet.getLastRow()-1, COLS);
  var data = range.getValues();
  for(var r=0; r<data.length; r++) {
    var cols = data[r];
    var folder = cols[FOLDERCOL];
    var fstat = cols[STATCOL];
    if (folder != "" && fstat=="") {
      var rowRange = sheet.getRange(r+1+HROWS, 1,1, COLS);
      processFolder(sheet, rowRange);
    }
  }
}

//Process a specific folder
// - set the status to processing
// - iterate through the list of files
// - if a file is an inventory file, update statitics counts
function processFolder(sheet, range) {
  var data = range.getValues();
  var cols = data[0];
  for(var i=FILECOL; i<COLS; i++) {
    cols[i]=0;
  }

  try {
    var folder = DriveApp.getFolderById(cols[FOLDERCOL]);
    cols[TITLECOL] = folder.getName();
    var files = folder.getFiles();
    cols[STATCOL]="Processing ...";
    range.setValues(data).setBackground("gray").setFontColor("red");
    SpreadsheetApp.flush();

    cols[STATCOL]="";
    while(files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() != "application/vnd.google-apps.spreadsheet"){
        continue;
      }
      if (!processFile(file, cols)) {
        break;
      }
    }
    range.setValues(data).setBackground("white").setFontColor("black");
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
function processFile(file, cols) {
  try {
    var isheet = SpreadsheetApp.open(file).getActiveSheet();
    //Verify that the column arrangement is as expected
    //If so, query the status field for each record
    if ((isheet.getRange(1, FILE_STAT_COL).getValue() != "Status") ||
        (isheet.getRange(1, FILE_BARCODE_COL).getValue() != "Barcode")) {
      //file is ignored.  Do not treat as an error.
      return true;
    }
    cols[FILECOL]++;
    var range = isheet.getRange(2, FILE_STAT_COL, isheet.getLastRow()-1, 1);
    var data = range.getValues();
    for(var i=0; i<data.length; i++) {
      cols[RECCOL]++;
      var stat = data[i][0];
      increment(cols, stat);
    }
  } catch(e) {
    cols[STATCOL] = e;
    return false;
  }
  cols[STATCOL]="Updated "+ Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH:mm:ss');
  return true;
}
