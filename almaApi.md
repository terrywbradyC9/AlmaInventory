# Using the Alma Sandbox to test the application

## Register to use the Alma API

https://developers.exlibrisgroup.com/alma/api-explorer

## Click Application -> Create Application

On the "Application Information" tab, Describe your application.

On the "API Management" tab, select the Bib API.  Specify "Sandbox read-only".

## Copy the API Key and add it to your local.prop file

    ;Alma APIKEY.  Add your api key here and save this to a location that is not web-accessible.
    ALMA_APIKEY=

## Start the service with docker-compose

Test with the following link which pre-loads a handful of barcodes [known to the Alma Sandbox](https://developers.exlibrisgroup.com/blog/Sample-IDs-for-running-Alma-API-on-the-Guest-Sandbox).

- PHP/Node: http://localhost/barcodeReport.html?test=333213718,18619,8558-10,34303,99999
- Jetty: http://localhost/inventory/barcodeReport.html?test=333213718,18619,8558-10,34303,99999

When barcodes have been pre-loaded in this manner, press Alt-S to simulate performing a barcode scan.
