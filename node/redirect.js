'use strict';

const express = require('express');
const fs = require('fs');

var APIKEY="";
var regex = /^ALMA_APIKEY=(\S+)\s*$/;
var lineReader = require('readline').createInterface({
  input: require('fs').createReadStream('/var/data/local.prop')
})
  .on("line", function(line){
    var match = regex.exec(line);
    if (match != null) {
      APIKEY=match[1];
    }
  }
);


// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// https://github.com/request/request
const app = express();
app.get('/redirect.js*', function (req, res) {
  var v = req.query.apipath;
  var qs = {
    "apikey": APIKEY
  };
  for(var k in req.query) {
    if (k == "apipath") continue;
    qs[k] = req.query[k];
  }
  const request = require('request');
  var opts = {
    method: 'GET',
    url: v,
    qs: qs,
    headers: {
      'Accept': 'application/json'
    }
  };
  request(opts).pipe(res);
});
app.get('/*', function (req, res) {
  var url = require('url').parse(req.url);
  res.sendFile( __dirname + "/" + url.pathname );
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
