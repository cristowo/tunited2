#!/usr/bin/env bash
# ============================================================
# Backup de las bases de datos de United Mudanzas
#
# Uso:    ./scripts/backup.sh [directorio_destino]
# Cron:   0 3 * * * cd /ruta/al/proyecto && ./scripts/backup.sh >> /var/log/mudanzas-backup.log 2>&1
#
# Genera dumps comprimidos de auth_db y main_db vía el contenedor
# de postgres y conserva los últimos RETENTION_DAYS días.
# ============================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"

# Lee POSTGRES_USER del .env (default postgres)
PGUSER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2 || true)"
PGUSER="${PGUSER:-postgres}"

for db in auth_db main_db; do
  out="$BACKUP_DIR/${db}_${TIMESTAMP}.sql.gz"
  echo "[$(date '+%F %T')] Respaldando $db → $out"
  docker compose exec -T postgres pg_dump -U "$PGUSER" "$db" | gzip > "$out"
done

# Rotación: eliminar respaldos con más de RETENTION_DAYS días
find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "[$(date '+%F %T')] Backup completado. Archivos actuales:"
ls -lh "$BACKUP_DIR" | tail -5
