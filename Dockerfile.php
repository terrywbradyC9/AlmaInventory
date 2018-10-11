FROM php:7-apache
COPY . /var/www/html
COPY php/barcode.init.js .
