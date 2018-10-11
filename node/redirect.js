'use strict';

const express = require('express');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// https://github.com/request/request
const app = express();
var APIKEY="";
app.get('/redirect.js*', function (req, res) {
  var v = "https://api-eu.hosted.exlibrisgroup.com/almaws/v1/" +
    req.query.apipath + "?item_barcode=" + req.query.item_barcode +
    "&apikey=" + APIKEY;
  const request = require('request');
  var opts = {
    method: 'GET',
    url: v,
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
