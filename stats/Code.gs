//Google Sheet Code to compute status for a collection of inventory runs
//Column Headers
//  Google Drive FolderId
//  Status (clear to recompute)
//  Folder name
//  File Count
//  Record Count
//  PASS
//  FAIL
//  NOT-FOUND
//  META-CALL
//  META-TTL
//  META-VOL
//  PULL
//  PULL-STAT
//  PULL-LOC
//  PULL-SUPP
//  PULL-HSUPP
//  PULL-DUE
//  PULL-MULT
//  Other

function onOpen() {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Gather Stats", "gatherStats")
    .addToUi();
}

var COLS = 19;
var STATS = {};
var HROWS = 1;

var FOLDERCOL=0;
var STATCOL = 1;
var TITLECOL = 2;
var FILECOL = 3;
var RECCOL = 4;
var COMPCOL = 5;


function setStatusCols(sheet) {
  COLS = sheet.getLastColumn();
  var hrange = sheet.getRange(1, 1, 1, COLS);
  var hdata = hrange.getValues();
  for(var i=COMPCOL; i<COLS; i++) {
    var s = hdata[0][i];
    if (s != "") {
      STATS[s] = i;
    }
  }
}

function increment(cols, stat) {
  if (stat == "") return;
  if (stat in STATS) {
    var index = STATS[stat];
    cols[index]++;
  } else {
    var index = STATS["Other"];
    cols[index]++;
    Logger.log(stat);
  }
}

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

function processFolder(sheet, range) {
  var data = range.getValues();
  var cols = data[0];
  cols[STATCOL]="Processing...";
  range.setValues(data);
  cols[STATCOL]="";
  for(var i=FILECOL; i<COLS; i++) {
    cols[i]=0;
  }

  try {
    var folder = DriveApp.getFolderById(cols[FOLDERCOL]);
    cols[TITLECOL] = folder.getName();
    var files = folder.getFiles();
    while(files.hasNext()) {
      var file = files.next();
      if (file.getMimeType() != "application/vnd.google-apps.spreadsheet"){
        continue;
      }
      cols[FILECOL]++;
      processFile(file, cols);
      if (cols[STATCOL] != "") break;
    }

    if (cols[STATCOL] == "") {
      cols[STATCOL]="Updated "+ Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH:mm:ss');
    }
    range.setValues(data);
  } catch(e) {
    Logger.log(e);
    cols[STATCOL]=e;
    range.setValues(data);
    return;
  }

}

function processFile(file, cols) {
  try {
    var isheet = SpreadsheetApp.open(file).getActiveSheet();
    var range = isheet.getRange(2, 11, isheet.getLastRow()-1, 1);
    var data = range.getValues();
    for(var i=0; i<data.length; i++) {
      cols[RECCOL]++;
      var stat = data[i][0];
      increment(cols, stat);
    }
  } catch(e) {
    cols[1] = e;
  }
}
