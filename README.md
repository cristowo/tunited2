# 🚛 Mudanzas United

Plataforma web para empresa de mudanzas con **cotizador online** y **panel de administración**.
Arquitectura de microservicios con React, Node.js, PostgreSQL (con Row-Level Security), RabbitMQ y Redis.

---

## ✨ Funcionalidades

**Sitio público**
- Landing con contenido **100% editable desde el panel** (hero, "quiénes somos",
  servicios, portafolio con subida de fotos, valores del footer, datos de
  contacto, mapa embebido, número de WhatsApp) — nada de esto requiere tocar código
- Cotizador en `/cotizar` (página propia, no embebida en el landing), formulario
  de 4 pasos con borrador guardado en `sessionStorage` (sobrevive un refresh
  accidental, se limpia al cerrar la pestaña o al enviar)
- Página 404 y `robots.txt` (bloquea `/login` y `/admin` de la indexación)

**Panel admin** (`/login`, sin enlace visible desde el landing)
- Gestión de cotizaciones: filtros, búsqueda, cambio de estado con máquina de
  estados validada, precio estimado, notas, eliminación (Ley 21.719)
- Catálogo de ítems (crear/editar/activar-desactivar)
- Contenido del landing (`/admin/contenido`), con subida de imágenes
- Cuenta: cambio de contraseña, alta de nuevos admins, **2FA (TOTP) opcional**
- Embudo de conversión del cotizador (a qué paso llega cada sesión, cuántas envían)

---

## 📐 Arquitectura

```
┌─────────────────────────────────────────────┐
│              React Frontend                  │
│   (Vite + TypeScript + Tailwind) — :5173/:80 │
└──────────────────┬──────────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────────┐
│            API Gateway — :3000               │
│   Express · valida JWT · exige rol admin     │
│   rate limiting · CORS · headers seguridad   │
└────────┬─────────────────────┬──────────────┘
         │ HTTP                │ HTTP
┌────────▼──────┐    ┌─────────▼──────────────┐
│ Auth Service  │    │   Main Service — :3002  │
│    :3001      │    │   (Cotizador + Admin)   │
│ JWT + bcrypt  │    └───────────┬─────────────┘
└───────┬───────┘                │ AMQP
        │              ┌─────────▼─────────────┐
┌───────▼───────┐      │      RabbitMQ          │
│  PostgreSQL   │      │  quote.created          │
│ auth_db       │      │  quote.status_changed   │
│ main_db (RLS) │      │  quote.price_set        │
└───────────────┘      └─────────┬──────────────┘
                       ┌─────────▼─────────────┐
                       │     Email Worker       │
                       │  (emails vía SMTP)     │
                       └───────────────────────┘
```

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind, React Query, React Router |
| API Gateway | Express, http-proxy-middleware, JWT, rate limiting (Redis) |
| Auth Service | Express, JWT (access + refresh rotativo), bcrypt, TOTP (`otplib` + `qrcode`) |
| Main Service | Express, PostgreSQL con RLS, `multer` + `sharp` (subida y validación de imágenes) |
| Mensajería | RabbitMQ + amqplib |
| Base de datos | PostgreSQL 16 (Row-Level Security, rol no-superuser) |
| Contenedores | Docker + Docker Compose |

## 📁 Estructura

```
UnitedMudanzas/
├── docker-compose.yml        # Producción: todos los servicios
├── docker-compose.dev.yml    # Override dev: expone puertos de infraestructura
├── .env                      # Secretos (NO se versiona)
├── .env.example              # Plantilla de variables
├── db/init/                  # Scripts de inicialización de PostgreSQL
│   ├── 00-create-app-role.sh #   rol app_service (password desde env)
│   ├── 01-create-databases.sql
│   ├── 02-auth-schema.sql    #   users (+ totp_secret/totp_enabled)
│   ├── 03-main-schema.sql    #   quotes, items, funnel_events, site_content
│   └── 04-rls.sql            #   políticas Row-Level Security
├── frontend/                 # Landing (/), cotizador (/cotizar), panel admin (/admin/*)
├── api-gateway/              # Puerto 3000 (solo red interna en producción)
├── auth-service/             # Puerto 3001 (+ scripts create-admin, 2FA)
└── main-service/             # Puerto 3002 (+ seed, email worker, uploads/ para imágenes)
```

---

## ⚙️ Configuración (`.env`)

Copia la plantilla y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Superusuario de PostgreSQL (solo init, seed y create-admin) |
| `POSTGRES_APP_SERVICE_USER` / `_PASSWORD` | Usuario de aplicación sujeto a RLS (lo usan los servicios) |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Generar con `openssl rand -base64 48`. Los servicios **no arrancan** con los placeholders |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Duración de tokens (`15m` / `7d`) |
| `RABBITMQ_USER` / `RABBITMQ_PASS` | Credenciales de RabbitMQ |
| `REDIS_PASSWORD` | Contraseña de Redis |
| `SMTP_HOST/PORT/USER/PASS` | Cuenta para enviar emails (el worker solo logea si falta) |
| `ADMIN_EMAIL` | Recibe el aviso cuando llega una cotización nueva |
| `ADMIN_PANEL_URL` | URL base del panel, usada en los enlaces de esos avisos |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma sin espacios |
| `VITE_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | Claves reCAPTCHA v2. En dev se pueden usar las [claves de prueba de Google](https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do) (siempre pasan) |
| `NODE_ENV` | En `production` el CAPTCHA es **obligatorio** (sin clave configurada se rechazan las cotizaciones) |
| `RETENTION_MONTHS` | Purga diaria de cotizaciones canceladas con más de N meses (Ley 21.719). `0` o vacío = desactivada |
| `TRUST_PROXY_HOPS` | Saltos de proxy confiables para detectar la IP real (default: 1 en gateway, 2 en servicios) |
| `INTERNAL_AUTH_SECRET` | Compartido entre `api-gateway` y `main-service`: el gateway firma `x-user-id`/`x-user-role` con esto antes de proxear a `/admin`, y `main-service` verifica la firma en vez de confiar en el header plano. Generar con `openssl rand -base64 48` |

> El texto e imágenes del landing (hero, servicios, portafolio, contacto,
> número de WhatsApp, URL del mapa, etc.) ya no se configuran por variables
> de entorno — son editables desde el panel admin en `/admin/contenido`.

> El `.env` vive en la **raíz** del proyecto. Todos los servicios lo cargan desde ahí,
> tanto en dev (`npm run dev`) como en Docker (`env_file`).

---

## 🧑‍💻 Desarrollo local

Probado en **WSL Ubuntu** (recomendado en Windows) y Linux nativo. Trabaja siempre en el
filesystem de Linux (`~/...`), no en `/mnt/c` — bcrypt es un módulo nativo y `/mnt/c` es lento.

### Requisitos

- **Node 20+** (`nvm install 20`)
- **Docker** con Compose v2 (en Windows: Docker Desktop con integración WSL activada)

### 1. Obtener el proyecto

Si el código está en Windows y desarrollas en WSL:

```bash
rsync -a --exclude node_modules --exclude dist \
  /mnt/c/Users/crist/Documents/proyecto/UnitedMudanzas/ ~/UnitedMudanzas/
cd ~/UnitedMudanzas
```

(Re-ejecuta el `rsync` cada vez que cambies código del lado Windows.)

### 2. Levantar la infraestructura

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres rabbitmq redis
docker compose ps   # esperar a que los 3 estén "healthy"
```

El override `docker-compose.dev.yml` expone los puertos al host (5432, 5672, 15672, 6379)
para que los servicios Node corran fuera de Docker. La **primera vez**, Postgres ejecuta los
scripts de `db/init/`: crea las bases, esquemas, el rol `app_service` y las políticas RLS.

### 3. Instalar dependencias

```bash
for d in api-gateway auth-service main-service frontend; do (cd $d && npm install); done
```

### 4. Datos iniciales

```bash
# Catálogo de muebles
(cd main-service && npm run seed)

# Primer admin — contraseña: mín. 12 caracteres con mayúscula, minúscula, número y símbolo
(cd auth-service && npm run create-admin -- admin@tunited.cl 'TuPassword123!')
```

### 5. Arrancar los servicios (una terminal cada uno)

```bash
cd auth-service  && npm run dev    # :3001
cd main-service  && npm run dev    # :3002
cd api-gateway   && npm run dev    # :3000
cd frontend      && npm run dev    # :5173
```

Opcional — worker de emails (sin SMTP configurado solo logea):

```bash
cd main-service && npx ts-node src/workers/emailWorker.ts
```

### 6. Probar

| Qué | URL |
|---|---|
| Landing | http://localhost:5173 |
| Cotizador | http://localhost:5173/cotizar |
| Panel admin | http://localhost:5173/login |
| Contenido del landing (admin) | http://localhost:5173/admin/contenido |
| Health del gateway | http://localhost:3000/health |
| RabbitMQ management | http://localhost:15672 (credenciales del `.env`) |

### Tests

```bash
cd main-service && npm test
```

### Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| `auth-service` sale con *"CRÍTICO: Cambia los JWT_SECRET"* | El `.env` de la raíz aún tiene los placeholders — genera secretos reales |
| `ECONNREFUSED` a Postgres | Falta el `-f docker-compose.dev.yml` (sin él los puertos no se exponen) |
| Cambios en `db/init/` no se aplican | Solo corren en la primera inicialización: `docker compose down -v` (⚠️ borra datos) y volver a levantar |
| El CAPTCHA falla siempre | `RECAPTCHA_SECRET_KEY` inválida — usa las claves de prueba de Google en dev |
| Error de módulo nativo (bcrypt) | `node_modules` copiado desde Windows — bórralo y `npm install` en Linux |
| Un admin perdió el dispositivo con el 2FA activado | Desactivarlo a mano: `UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE email='...';` vía psql, conectado como `postgres` (mismo modelo de acceso que `create-admin`) |

---

## 🚀 Producción

Todo corre en Docker. Solo se expone el **frontend (:80)**; el gateway, Postgres,
RabbitMQ y Redis quedan en la red interna sin puertos publicados. El gateway
**no** debe exponerse directo al host: confía en `trust proxy: 1` asumiendo
que nginx es el único proxy delante, y un cliente que le pegue directo
podría falsificar `X-Forwarded-For` para saltarse el rate limiting.

### 1. Checklist previo

- [ ] `.env` con **secretos reales**: JWT, `INTERNAL_AUTH_SECRET` (`openssl rand -base64 48` cada uno), contraseñas de Postgres/RabbitMQ/Redis
- [ ] Claves **reales** de reCAPTCHA v2 (`VITE_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY`) — con `NODE_ENV=production` el CAPTCHA es obligatorio
- [ ] `CORS_ORIGIN` con el dominio real (ej: `https://tunited.cl,https://www.tunited.cl`)
- [ ] `SMTP_*` configurado para que salgan los emails
- [ ] El `.env` **no** está en el repositorio (ya cubierto por `.gitignore`)
- [ ] Si el servidor ya tenía una BD inicializada antes de esta versión: aplicar
      a mano los `ALTER TABLE`/`CREATE TABLE` de `db/init/02-auth-schema.sql`,
      `03-main-schema.sql` y `04-rls.sql` (2FA, embudo, contenido del landing) —
      ver detalle en `PENDIENTES.md`

### 2. Construir y levantar

```bash
docker compose up -d --build
docker compose ps        # todos "Up" / "healthy"
docker compose logs -f   # revisar arranque
```

Servicios que levanta: `postgres`, `rabbitmq`, `redis`, `auth-service`, `main-service`,
`email-worker`, `api-gateway` (solo red interna) y `frontend` (:80, nginx que sirve la
SPA y proxea `/api` y `/auth` al gateway).

### 3. Bootstrap (solo el primer deploy)

Los scripts compilados van incluidos en las imágenes:

```bash
# Catálogo de ítems + contenido inicial del landing (idempotente, se puede re-correr)
docker compose exec main-service node dist/db/seed.js

# Primer usuario admin
docker compose exec auth-service node dist/db/createAdmin.js admin@tunited.cl 'PasswordSegura123!'
```

El contenido sembrado es un punto de partida (los mismos textos del landing
original) — edítalo desde `/admin/contenido` una vez que tengas acceso al panel.

### 4. HTTPS

El compose entrega HTTP. En producción pon delante un proxy con TLS — opciones:

- **Caddy / Traefik / nginx** en el mismo host apuntando a `localhost:80`, con certificados Let's Encrypt
- Plataformas tipo **Railway/Render** o un balanceador cloud que termine TLS

Los servicios ya envían `Strict-Transport-Security`, así que una vez detrás de HTTPS los
navegadores no volverán a HTTP.

### Operación

```bash
docker compose logs -f api-gateway      # logs de un servicio
docker compose up -d --build frontend   # redeploy de un servicio
docker compose down                     # apagar (los datos persisten en volúmenes)
docker compose down -v                  # ⚠️ apagar Y BORRAR datos
```

### Backups

`scripts/backup.sh` respalda ambas bases (dumps comprimidos) y rota los antiguos:

```bash
./scripts/backup.sh                 # respalda a ./backups, conserva 14 días
RETENTION_DAYS=30 ./scripts/backup.sh /var/backups/mudanzas
```

Programado con cron (3 AM diario):

```cron
0 3 * * * cd /ruta/al/proyecto && ./scripts/backup.sh >> /var/log/mudanzas-backup.log 2>&1
```

Idealmente copia los dumps fuera del servidor (rclone, S3, etc.).

### CI

GitHub Actions (`.github/workflows/ci.yml`) corre en cada push/PR: typecheck,
tests y auditoría de dependencias por servicio, más el build del frontend.

---

## 🔐 Seguridad implementada

- **RLS en PostgreSQL**: los servicios se conectan como `app_service` (no-superuser); cada
  transacción fija su contexto (`service`/`admin`) con `SET LOCAL` — ver `db/init/04-rls.sql`
- **JWT con refresh rotativo**: access 15 min; refresh de un solo uso, guardado **hasheado**
  (SHA-256) en BD y revocable en logout; limpieza horaria de expirados
- **Autorización en capas**: el gateway valida firma JWT **y rol admin**; antes de proxear
  a `/admin` firma `x-user-id`/`x-user-role` con HMAC (`INTERNAL_AUTH_SECRET`) y el
  main-service verifica esa firma (no el header plano) antes de confiar en el rol —
  así, alcanzar el main-service directo (sin pasar por el gateway) ya no basta para
  obtener acceso admin
- **Gateway sin puerto publicado**: en producción solo el frontend (nginx, :80) es
  accesible desde afuera; el gateway queda en la red interna, evitando que un
  cliente externo le pegue directo y falsifique `X-Forwarded-For` para saltarse
  el rate limiting (`trust proxy: 1` asume que nginx es el único proxy delante)
- **Login resistente a enumeración**: misma respuesta y mismo tiempo (compare dummy) exista o no el email
- **2FA (TOTP) opcional para admin**: activable desde Cuenta (`otplib` + QR); si está activo,
  el login exige el código antes de emitir tokens. Acceso admin no enlazado desde el landing
  (`/login` directo) y bloqueado de la indexación vía `robots.txt`
- **Validación estricta de entrada** en el cotizador + escape de HTML en los emails salientes
- **Subida de imágenes validada por contenido real**: el endpoint de imágenes del landing
  no confía en el `Content-Type` declarado — decodifica los píxeles con `sharp` y
  vuelve a codificar el archivo, descartando cualquier byte ajeno a la imagen
- **reCAPTCHA v2 obligatorio en producción** + rate limiting por endpoint (login: 10/15min; cotizaciones: 10/h)
- **Headers**: Helmet (CSP, HSTS, frameguard), Permissions-Policy, CORS con allowlist
- **Contenedores**: corren como usuario `node` sin privilegios; infraestructura sin puertos expuestos

## 📋 Notas legales (Ley 21.719 — Chile)

El sitio almacena datos personales (nombre, email, teléfono, direcciones):

- El formulario exige **consentimiento explícito** (checkbox + texto + timestamp en BD)
- Los datos se usan solo para gestionar la cotización solicitada
- El cliente puede solicitar la eliminación de sus datos
- **Política de Privacidad** publicada en `/privacidad` (enlazada desde el footer)
- Purga automática de cotizaciones canceladas tras `RETENTION_MONTHS` (ver `.env`)
