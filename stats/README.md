## Generating Stats for the Inventory Process

The following process can be used as a sample solution for reporting metrics on the inventory process.

1. Create a Google Sheet
 - Copy the header row from [InventoryStatsReporting.csv](InventoryStatsReporting.csv)
 - Embed [Code.gs](Code.gs) as a Spreadsheet script
 - Add [ByLCClass.gs](ByLCClass.gs) to the script project

![](doc1.png)

2. Run the "gather stats" option from the Add-On Menu

![](doc2.png)

3. Carefully review the authorization message presented by the script.  
 - Review the code to make sure that you are comfortable granting this access

![](auth1.png)

![](auth2.png)

4. The code will run through each folder and update stats counts

![](doc3.png)

![](doc4.png)

![](doc5.png)

5. If you wish to calculate stats by LC Class, add a worksheet named "ByCallNum"

![](lcstat1.png)
