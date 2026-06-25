# 📋 Pasos futuros — Mudanzas United

Estado al 2026-06-10. Todo lo construido está en `main` (3 commits), verificado con
typecheck, 35 tests y builds. Lo que sigue, en orden sugerido.

> **Actualización 2026-06-17**: al probar el flujo completo por primera vez en
> WSL (Fase 1, abajo) salió un bug crítico preexistente: `api-gateway` llamaba
> `express.json()` antes de proxear, lo que dejaba **todo POST con body
> colgado indefinidamente** (login, crear cotización, etc.) — ya corregido
> (el gateway nunca necesitó leer `req.body`, es un proxy puro). De paso se
> separó el cotizador a `/cotizar`, se quitó el acceso admin visible del
> landing, se agregó página 404, `robots.txt`, 2FA admin y el embudo de
> conversión (ver checklist de abajo para lo que falta de cada uno).

---

## 🔑 Fase 1 — Verificación (esta semana, solo lo puedes hacer tú)

- [ ] **Probar el flujo completo en WSL**
  ```bash
  rsync -a --delete --exclude node_modules --exclude dist \
    /mnt/c/Users/crist/Documents/proyecto/UnitedMudanzas/ ~/UnitedMudanzas/
  cd ~/UnitedMudanzas
  for d in api-gateway auth-service main-service frontend; do (cd $d && npm install); done
  ```
  ⚠️ Si el volumen de Postgres es anterior a los cambios de RLS: `docker compose down -v`
  y volver a levantar (borra datos, re-ejecuta `db/init/`).

  Flujo a verificar de punta a punta:
  1. Enviar una cotización desde el formulario público (CAPTCHA de prueba pasa solo)
  2. Ver que llegue el evento al email worker (logs si no hay SMTP)
  3. Login en `/login` → ver la cotización en el panel
  4. Cambiar estado (solo permite transiciones válidas), asignar precio, notas
  5. Probar Catálogo (crear/editar/desactivar ítem) y Cuenta (cambio de contraseña)
  6. Probar la eliminación de una cotización (Ley 21.719)

- [ ] **Revisar el primer run del CI** en GitHub → pestaña Actions
      (repo privado, no se pudo verificar desde la sesión)

---

## 🚀 Fase 2 — Salida a producción

- [ ] **Credenciales reales** en el `.env` del servidor:
  - Claves reCAPTCHA v2 de producción (https://www.google.com/recaptcha/admin)
  - Cuenta SMTP real (`SMTP_PASS` sigue en placeholder)
  - `CORS_ORIGIN` y `ADMIN_PANEL_URL` con el dominio real
  - `NODE_ENV=production`
- [ ] **Infraestructura**: VPS/hosting, dominio, DNS
- [ ] **HTTPS**: proxy con TLS delante del compose (Caddy es lo más simple,
      ver sección Producción del README)
- [ ] **Bootstrap**: seed del catálogo + primer admin (`docker compose exec`, ver README)
- [ ] **Backups fuera del servidor**: el cron de `scripts/backup.sh` ya rota localmente;
      falta copiar los dumps a S3/Drive/etc. con rclone
- [ ] **Monitoreo externo**: UptimeRobot (gratis) apuntando a `/health` del gateway;
      idealmente Sentry para errores

---

## 🟠 Fase 3 — Técnico (antes de que haya datos y usuarios reales)

- [ ] **Migraciones de BD** — la mejora estructural más importante pendiente.
      `db/init/` solo corre en la primera inicialización; cambiar el esquema en
      producción hoy sería SQL a mano. Sugerencia: `node-pg-migrate`.
      ⚠️ Ya hay deuda concreta esperando esto: el 2FA admin (`users.totp_secret`,
      `users.totp_enabled`) y el embudo del cotizador (tabla `funnel_events`,
      con sus GRANT/RLS) se agregaron a `db/init/02-auth-schema.sql`,
      `db/init/03-main-schema.sql` y `db/init/04-rls.sql` para instalaciones
      nuevas, pero cualquier Postgres ya inicializado (incluida producción
      si ya está corriendo) necesita el `ALTER TABLE` / `CREATE TABLE`
      equivalente a mano — son los mismos bloques que están en esos archivos.
- [ ] **Códigos de respaldo para 2FA** — hoy si un admin activa 2FA y pierde el
      dispositivo, la única recuperación es desactivarlo a mano vía psql
      (`UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE email=...`,
      documentado en el README). Backup codes de un solo uso evitarían depender
      de acceso a la BD.
- [ ] **Recuperación de contraseña por email** — si el único admin la olvida,
      hoy se necesita acceso al servidor (CLI `create-admin`). Falta el flujo
      "olvidé mi contraseña" con token enviado por correo.
- [ ] **Gestión de admins completa** — se pueden crear desde el panel, pero no
      listar ni desactivar (`users.is_active` existe; falta endpoint + UI).
- [ ] **Tests de integración** — los 35 actuales son unitarios. Falta:
  - Rutas contra BD real (supertest + Postgres como service container en CI)
  - E2E del formulario (Playwright)
  - Tests del frontend (hoy no tiene ninguno)
- [ ] **Logs estructurados** — sigue siendo `console.log` sin request-id.
      Pino + pino-http en los 3 servicios (~30 call sites, por eso se postergó).
- [ ] **Refresh token a cookie httpOnly** — hoy va en localStorage (tradeoff
      documentado en `frontend/src/services/auth.ts`); es la mejora de seguridad
      restante de mayor valor.

---

## 🔵 Fase 4 — Producto y contenido

- [ ] **Testimonios reales** para la landing (los del sitio antiguo eran relleno
      del template y se omitieron)
- [ ] **Fotos propias** — las del portafolio vienen del sitio viejo y varias son
      stock (una con metadatos de Bigstock); confirmar licencia o reemplazar con
      fotos reales del equipo/camiones
- [ ] **SEO**: sitemap.xml, etiquetas Open Graph, Google Business
- [x] **Analytics de conversión del cotizador** — embudo propio (sin servicio
      externo) en `funnel_events` + panel admin (`GET /admin/funnel`, fila
      "Embudo del cotizador" en el Dashboard). Si más adelante se necesita algo
      más completo (heatmaps, por dispositivo, etc.) ahí sí conviene Plausible/GA.

---

## Referencias rápidas

| Qué | Dónde |
|---|---|
| Cómo levantar dev y producción | `README.md` |
| Variables de entorno | `README.md` (tabla) y `.env.example` |
| Backups | `scripts/backup.sh` + sección Backups del README |
| Máquina de estados de cotizaciones | `main-service/src/validation/statusTransitions.ts` |
| Validación del formulario público | `main-service/src/validation/quote.ts` |
| Política de privacidad | `frontend/src/pages/PrivacyPolicy.tsx` (ruta `/privacidad`) |
