//Increment the counter for a specific status value for an LC class.
//Create a record if a new LC class is discovered
function lcincrement(folderid, lcmap, lcclass, stat) {
  lcclass = lcclass.replace(/^([A-Z]+).*$/,"$1");
  lcclass = (lcclass.length > 3) ? "Other" : lcclass;

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
  if (rcount > 0 && rstart > 0) {
    lcsheet.deleteRows(rstart, rcount);
  }
}
