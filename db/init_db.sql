CREATE DATABASE IF NOT EXISTS banking_app;

GRANT ALL PRIVILEGES on banking_app.*
TO 'root'@'%' IDENTIFIED BY 'password'
WITH GRANT OPTION;