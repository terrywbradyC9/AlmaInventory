<?php
/*
Author: Terry Brady, Georgetown University Libraries
Wrapper to pass a request through to the Alma API.  The alma api request will be passed in the param apipath.
*/
include 'Alma.php';

$ALMA = new Alma();
header("Content-type: application/json");
$ALMA->getRequest($_GET);

?>
