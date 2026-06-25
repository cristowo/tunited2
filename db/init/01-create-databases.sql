-- Crea las dos bases de datos si no existen
SELECT 'CREATE DATABASE auth_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db')\gexec
SELECT 'CREATE DATABASE main_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'main_db')\gexec
