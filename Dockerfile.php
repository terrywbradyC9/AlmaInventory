FROM php:7-apache
COPY webapp/* /var/www/html/
COPY php/* /var/www/html/php/
COPY php/barcode.init.js .
