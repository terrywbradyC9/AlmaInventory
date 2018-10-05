# AlmaInventory
This code will facilitate an inventory of items cataloged in the Alma integrated library system.

- Physical items are handled one at a time and scanned with a barcode scanner
- The user can press a button to indicate if there is a mismatch in the title, volume or call number of the physical item
- A request is sent to the Alma Bib API to retrieve known information for that Barcode
  - To avoid cross-origin restrictions, a PHP service is used to call the Alma API and to add the Alma API key
  - This service simply appends the api key to the request and returns the json object provided from the Alma API
- Results are displayed in a table with common errors highlighted
- Optionally, the user can upload results of a scanning session to Google sheets

## Pre-requisites

### Pre-requisites (Alma)

The Alma Bib API will be used. https://developers.exlibrisgroup.com/alma/apis/bibs

- Obtain a login for the Alma Developer Network
- Create a Read-only API key for the Bib API
- Copy `local.prop.template` to `local.prop`
- Add your api key to `local.prop`

### Pre-requisites (Docker)
Install [Docker for Windows or MacOS](https://www.docker.com/get-started) to test this process.

From a terminal window
- cd to the directory containing these files
- run `docker-compose up -d`
  - Docker compose will pass your local.prop file to the correct location.
- run `docker-compose down` to stop the service

Open http://localhost/barcodeReport.html to test the program.
- Click "Add Barcode"
- Using a barcode scanner or the keyboard, enter a 14 digit barcode
- If your API has been correctly enabled, you will see results returned for the item

### Pre-requisites (Google Sheets)

Deploy a web service in Google Drive to save CSV data into a Google Drive Folder
- See https://github.com/Georgetown-University-Libraries/PlainTextCSV_GoogleAppsScript
- Copy `gsheet.prop.json.template` to `gsheet.prop.json`
- Add the address of your web service and the folder ids for a test and production inventory to the json file

Restart the docker service `docker-compose restart` to refresh the resources.
- View http://localhost/gsheet.prop.json to verify that your changes are in place.
- Clear your cache and refresh the file if needed

## Deploying for production use
The assets in this folder can be deployed with a PHP server that you run in production.

If you do not run PHP, the logic contained in Alma.php and barcodeReportRedirect.php should be fairly simple to migrate to Node.js or some other web service framework.
