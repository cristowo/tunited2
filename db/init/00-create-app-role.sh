#!/bin/sh
# ============================================================
# Crea el rol de aplicación 'app_service' con la contraseña
# tomada de la variable de entorno POSTGRES_APP_SERVICE_PASSWORD.
# Se ejecuta antes que los .sql (orden alfabético en initdb.d).
# Evita hardcodear la contraseña en el SQL versionado.
# ============================================================
set -e

if [ -z "$POSTGRES_APP_SERVICE_PASSWORD" ]; then
  echo "ERROR: POSTGRES_APP_SERVICE_PASSWORD no está definida" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_service') THEN
    CREATE ROLE app_service LOGIN PASSWORD '${POSTGRES_APP_SERVICE_PASSWORD}';
  ELSE
    ALTER ROLE app_service WITH PASSWORD '${POSTGRES_APP_SERVICE_PASSWORD}';
  END IF;
END\$\$;
EOSQL

echo "Rol app_service creado/actualizado correctamente."
