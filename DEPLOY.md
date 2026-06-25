# Guía de despliegue — United Mudanzas
### Servidor local con CasaOS + Portainer

---

## Lista de verificación antes de desplegar

Completa esto antes de ejecutar cualquier paso. Un solo valor por defecto en producción es una vulnerabilidad.

### Seguridad obligatoria

- [ ] `POSTGRES_PASSWORD` cambiado (mínimo 20 caracteres, aleatorio)
- [ ] `POSTGRES_APP_SERVICE_PASSWORD` cambiado y coincide con el valor en `db/init/04-rls.sql`
- [ ] `JWT_SECRET` generado con al menos 64 caracteres aleatorios
- [ ] `JWT_REFRESH_SECRET` generado con al menos 64 caracteres aleatorios — **distinto** al anterior
- [ ] `RABBITMQ_USER` y `RABBITMQ_PASS` cambiados (no usar `guest/guest`)
- [ ] `CORS_ORIGIN` apunta exactamente a la IP o dominio del servidor (sin barra final)
- [ ] `VITE_RECAPTCHA_SITE_KEY` y `RECAPTCHA_SECRET_KEY` son claves reales de Google, no las de prueba

### Puertos expuestos

Solo estos puertos deben ser accesibles desde fuera del servidor:

| Puerto | Servicio | Acceso |
|--------|----------|--------|
| 80 | Frontend (nginx) | Público |
| 15672 | RabbitMQ UI | Solo red local o VPN |

El **API Gateway (:3000) no debe publicarse** al host — `docker-compose.yml`
ya no le mapea puerto. nginx lo alcanza por la red interna de Docker. Si se
publica directo, un cliente externo puede saltarse nginx y falsificar
`X-Forwarded-For` para evadir el rate limiting (el gateway confía en que
nginx es el único proxy delante, vía `trust proxy: 1`).

Los servicios internos **nunca** deben quedar expuestos al exterior:

| Puerto | Servicio | Debe ser interno |
|--------|----------|-----------------|
| 3001 | auth-service | Sí |
| 3002 | main-service | Sí |
| 5432 | PostgreSQL | Sí |
| 5672 | RabbitMQ (AMQP) | Sí |
| 6379 | Redis | Sí |

---

## Paso 1 — Preparar el `.env`

Copia `.env.example` a `.env` y completa todos los valores:

```bash
cp .env.example .env
```

### Variables críticas

```env
# ── PostgreSQL ────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<contraseña segura, mínimo 20 chars>
POSTGRES_AUTH_DB=auth_db
POSTGRES_MAIN_DB=main_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Usuario de aplicación (no-superuser, sujeto a Row Level Security)
# Debe coincidir con la contraseña en db/init/04-rls.sql
POSTGRES_APP_SERVICE_USER=app_service
POSTGRES_APP_SERVICE_PASSWORD=<contraseña segura diferente a la anterior>

# ── JWT ───────────────────────────────────────────────────
JWT_SECRET=<string aleatorio 64+ chars>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<string aleatorio 64+ chars, diferente al anterior>
JWT_REFRESH_EXPIRES_IN=7d

# ── RabbitMQ ──────────────────────────────────────────────
RABBITMQ_URL=amqp://<usuario>:<contraseña>@rabbitmq:5672
RABBITMQ_USER=<usuario personalizado, no 'guest'>
RABBITMQ_PASS=<contraseña segura>

# ── Redis ─────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Email ─────────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@email.com
SMTP_PASS=<app password de Gmail, no la contraseña de la cuenta>

# ── Puertos ───────────────────────────────────────────────
GATEWAY_PORT=3000
AUTH_PORT=3001
MAIN_PORT=3002

# ── CORS ──────────────────────────────────────────────────
# La URL exacta desde donde el navegador carga el frontend.
# Sin barra al final. Para múltiples orígenes, separar con coma.
CORS_ORIGIN=http://192.168.X.X

# ── reCAPTCHA ─────────────────────────────────────────────
VITE_RECAPTCHA_SITE_KEY=<clave pública del sitio>
RECAPTCHA_SECRET_KEY=<clave secreta del servidor>
```

### Generadores de secretos

**PowerShell:**
```powershell
# JWT Secret (64 chars)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

**Linux/Mac:**
```bash
openssl rand -base64 48
```

---

## Paso 2 — Actualizar la contraseña del usuario de base de datos

El archivo `db/init/04-rls.sql` crea el rol `app_service` con una contraseña de placeholder. Antes de desplegar, reemplázala con el mismo valor que pusiste en `POSTGRES_APP_SERVICE_PASSWORD`:

Abre `db/init/04-rls.sql` y busca esta línea:

```sql
CREATE ROLE app_service LOGIN PASSWORD 'app_service_changeme';
```

Cámbiala a:

```sql
CREATE ROLE app_service LOGIN PASSWORD 'tu_contraseña_real';
```

> Si la base de datos ya fue inicializada con la contraseña anterior, ejecuta este comando desde el contenedor de postgres:
> ```sql
> ALTER ROLE app_service PASSWORD 'tu_contraseña_real';
> ```

---

## Paso 3 — Subir el proyecto al servidor

```powershell
scp -r "C:\Users\crist\Documents\proyecto\UnitedMudanzas" usuario@192.168.X.X:/home/usuario/
```

Verifica que llegó:
```bash
ssh usuario@192.168.X.X "ls /home/usuario/UnitedMudanzas"
```

Deberías ver: `frontend`, `api-gateway`, `auth-service`, `main-service`, `db`, `docker-compose.yml`.

---

## Paso 4 — Desplegar en Portainer

1. Abre Portainer: `http://192.168.X.X:9000`
2. Menú lateral → **Stacks** → **Add stack**
3. Nombre: `united-mudanzas`
4. Selecciona **Repository** (si usas GitHub) o **Upload** para subir `docker-compose.yml`
5. En **Environment variables** → **Load variables from .env file** → sube el `.env`
6. Clic en **Deploy the stack**

La primera build tarda entre 3 y 8 minutos.

---

## Paso 5 — Verificar que todo esté corriendo

En Portainer → **Containers**. Todos deben estar en verde:

| Contenedor | Estado esperado |
|---|---|
| `united-mudanzas_postgres` | Running |
| `united-mudanzas_rabbitmq` | Running |
| `united-mudanzas_redis` | Running |
| `united-mudanzas_auth-service` | Running |
| `united-mudanzas_main-service` | Running |
| `united-mudanzas_api-gateway` | Running |
| `united-mudanzas_frontend` | Running |

Si alguno aparece en rojo, haz clic en él y revisa los **Logs**.

---

## Paso 6 — Activar Row Level Security (RLS)

**Solo se hace una vez**, después de que PostgreSQL esté corriendo.

El archivo `db/init/04-rls.sql` se ejecuta automáticamente si lo tienes en el volumen de init de Docker. Si no, ejecútalo manualmente:

En Portainer → `united-mudanzas_postgres` → **Exec console** → `/bin/bash`:

```bash
psql -U postgres -f /docker-entrypoint-initdb.d/04-rls.sql
```

O desde el host:

```bash
docker exec -i united-mudanzas_postgres-1 psql -U postgres < /home/usuario/UnitedMudanzas/db/init/04-rls.sql
```

Verifica que RLS esté activo:
```bash
docker exec -i united-mudanzas_postgres-1 psql -U postgres -d main_db -c "\d quotes"
```
En la columna `RLS` debe aparecer `enabled`.

---

## Paso 7 — Cargar el catálogo de muebles (seed)

**Solo se hace una vez.**

Portainer → `united-mudanzas_main-service` → **Exec console** → `/bin/sh`:

```sh
node dist/db/seed.js
```

Resultado esperado:
```
Seed completado: X ítems nuevos insertados
```

---

## Paso 8 — Crear el primer usuario administrador

Portainer → `united-mudanzas_auth-service` → **Exec console** → `/bin/sh`:

```sh
node dist/db/createAdmin.js admin@tuempresa.com TuPassword123
```

Usa una contraseña fuerte. Resultado esperado:
```
Admin creado: admin@tuempresa.com (id: xxxx-xxxx-...)
```

---

## Paso 9 — Acceder a la aplicación

| Servicio | URL |
|---|---|
| Cotizador público | `http://192.168.X.X` |
| Panel de administración | `http://192.168.X.X/login` |
| RabbitMQ UI (monitoreo) | `http://192.168.X.X:15672` |

---

## Consideraciones de seguridad en producción

### Contraseñas y secretos

- **No reutilices contraseñas** entre `POSTGRES_PASSWORD`, `POSTGRES_APP_SERVICE_PASSWORD`, `RABBITMQ_PASS` y los secretos JWT.
- Los secretos JWT deben rotarse periódicamente. Al rotarlos, todos los access tokens activos se invalidan (los usuarios deben volver a iniciar sesión). Los refresh tokens en BD también quedan inválidos.
- Si sospechas que un secreto fue comprometido, cámbialo de inmediato y reinicia los servicios.

### HTTPS

Los security headers incluyen `Strict-Transport-Security` (HSTS), que solo tiene efecto real sobre conexiones HTTPS. Si despliegas con HTTP (red local), el header se envía pero el navegador no lo puede hacer cumplir.

Para habilitar HTTPS en red local:
- Usa un reverse proxy como **Nginx Proxy Manager** (disponible en CasaOS) con certificado autofirmado, o
- Expón el servidor a internet y usa **Let's Encrypt** a través de Nginx Proxy Manager.

Si usas HTTPS, actualiza `CORS_ORIGIN` con `https://`:
```env
CORS_ORIGIN=https://tudominio.cl,https://www.tudominio.cl
```

### CORS

El gateway solo acepta requests del navegador desde los orígenes definidos en `CORS_ORIGIN`. Los orígenes rechazados se loguean como advertencia:
```
CORS: origen rechazado → http://otro-origen.com
```

Si ves este log inesperadamente, revisa si el frontend está siendo servido desde una URL diferente a la configurada.

### Row Level Security

Los servicios se conectan a PostgreSQL como `app_service`, no como el superusuario `postgres`. El superusuario bypasea RLS por diseño de PostgreSQL.

Si necesitas hacer consultas de mantenimiento directas a la BD, usa `postgres` desde el contenedor:
```bash
docker exec -it united-mudanzas_postgres-1 psql -U postgres -d main_db
```
Nunca uses las credenciales de `postgres` en el código de la aplicación.

### RabbitMQ

- Cambia las credenciales `guest/guest` antes del primer arranque. El usuario `guest` por defecto solo puede conectarse desde `localhost`, pero en Docker la red interna puede permitirlo dependiendo de la configuración.
- La UI de gestión (puerto 15672) no debe estar expuesta a internet. Úsala solo en red local.

### Logs

Los servicios loguean a stdout. En Portainer puedes verlos en tiempo real. Por defecto Docker no limita el tamaño de los logs; en producción configura un límite en `docker-compose.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Comandos útiles por SSH

```bash
# Conectarse al servidor
ssh usuario@192.168.X.X

# Ver logs en tiempo real
docker logs -f united-mudanzas_api-gateway-1
docker logs -f united-mudanzas_auth-service-1
docker logs -f united-mudanzas_main-service-1

# Reiniciar un servicio
docker restart united-mudanzas_api-gateway-1

# Parar todo el stack
cd /home/usuario/UnitedMudanzas
docker compose down

# Levantar todo
docker compose up -d

# Rebuild completo (después de cambios en el código)
docker compose up --build -d

# Resetear todo incluyendo datos de la BD (destructivo)
docker compose down -v
```

---

## Actualizar la aplicación después de cambios

1. Copia los archivos modificados al servidor con `scp`
2. En Portainer → **Stacks** → `united-mudanzas` → **Update the stack** → marca **Re-pull image** → **Update**

O por SSH:
```bash
cd /home/usuario/UnitedMudanzas
docker compose up --build -d
```

---

## Solución de problemas frecuentes

**El contenedor `auth-service` o `main-service` se reinicia en bucle**
→ PostgreSQL aún no estaba listo. Espera 30 segundos y revisa los logs.
→ Verifica que `POSTGRES_PASSWORD` coincida con el valor con que se creó la BD.

**Error de RLS: `permission denied for table quotes`**
→ El servicio está conectándose como `postgres` en lugar de `app_service`.
→ Verifica que `POSTGRES_APP_SERVICE_USER` y `POSTGRES_APP_SERVICE_PASSWORD` estén en el `.env`.
→ Verifica que el script `04-rls.sql` se ejecutó correctamente.

**El formulario no envía — error de CORS en la consola del navegador**
→ `CORS_ORIGIN` no coincide exactamente con la URL del navegador (mayúsculas, barra final, puerto).
→ El origen rechazado aparece en los logs del gateway: `CORS: origen rechazado → ...`

**El panel admin redirige siempre a `/login`**
→ El usuario admin no fue creado. Repite el Paso 8.

**RabbitMQ muestra error de conexión en los logs del `main-service`**
→ RabbitMQ tarda más en iniciar que los demás servicios. Reinicia el contenedor `main-service` desde Portainer.

**`auth-service` sale con "CRÍTICO: Cambia los JWT_SECRET"**
→ Los valores `JWT_SECRET` o `JWT_REFRESH_SECRET` en el `.env` son los de ejemplo. Genera valores reales.

---

## Nota sobre reCAPTCHA

La clave de prueba de Google funciona pero muestra una advertencia visual en el formulario y no verifica realmente.

Para obtener claves reales (gratis):
1. Ve a `https://www.google.com/recaptcha/admin/create`
2. Tipo: **reCAPTCHA v2 → "No soy un robot"**
3. Dominio: agrega la IP o dominio de tu servidor
4. Copia la **clave del sitio** → `VITE_RECAPTCHA_SITE_KEY`
5. Copia la **clave secreta** → `RECAPTCHA_SECRET_KEY`
6. Haz rebuild del frontend: `docker compose up --build -d frontend`
