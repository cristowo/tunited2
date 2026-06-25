-- ============================================================
-- Row Level Security (RLS) — United Mudanzas
-- ============================================================
-- Los servicios se conectan como 'app_service' (no-superuser).
-- El superuser 'postgres' bypasea RLS; este rol no lo hace.
-- Contexto por request: SET LOCAL via set_config('app.current_role', ...)
--   'admin'   → operaciones autenticadas de administrador
--   'service' → operaciones públicas del servicio (login, cotizaciones)
-- ============================================================

-- El rol de aplicación 'app_service' se crea en 00-create-app-role.sh,
-- tomando la contraseña de POSTGRES_APP_SERVICE_PASSWORD (no se hardcodea aquí).

-- ============================================================
-- AUTH DB
-- ============================================================
\connect auth_db

GRANT CONNECT ON DATABASE auth_db TO app_service;
GRANT USAGE   ON SCHEMA public TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users          TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE refresh_tokens TO app_service;

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- FORCE aplica RLS incluso al dueño de la tabla (excepto superuser)
ALTER TABLE users          FORCE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;

-- ── Políticas: users ──────────────────────────────────────
-- El servicio necesita leer usuarios para login / /me
CREATE POLICY users_select ON users
  FOR SELECT TO app_service
  USING (true);

-- Crear usuarios requiere contexto admin. El primer admin se crea con el
-- script create-admin, que se conecta como superuser y bypasea RLS.
CREATE POLICY users_insert ON users
  FOR INSERT TO app_service
  WITH CHECK (current_setting('app.current_role', true) = 'admin');

-- Modificar o eliminar usuarios requiere rol admin
CREATE POLICY users_update ON users
  FOR UPDATE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY users_delete ON users
  FOR DELETE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: refresh_tokens ─────────────────────────────
-- El servicio gestiona el ciclo completo de tokens
CREATE POLICY tokens_all ON refresh_tokens
  FOR ALL TO app_service
  USING     (true)
  WITH CHECK (true);

-- ============================================================
-- MAIN DB
-- ============================================================
\connect main_db

GRANT CONNECT ON DATABASE main_db TO app_service;
GRANT USAGE   ON SCHEMA public TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE items            TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE quotes           TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE quote_items      TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE quote_status_log TO app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE funnel_events    TO app_service;
GRANT SELECT, UPDATE                 ON TABLE site_content     TO app_service;

ALTER TABLE items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content     ENABLE ROW LEVEL SECURITY;

ALTER TABLE items            FORCE ROW LEVEL SECURITY;
ALTER TABLE quotes           FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_items      FORCE ROW LEVEL SECURITY;
ALTER TABLE quote_status_log FORCE ROW LEVEL SECURITY;
ALTER TABLE funnel_events    FORCE ROW LEVEL SECURITY;
ALTER TABLE site_content     FORCE ROW LEVEL SECURITY;

-- ── Políticas: items ──────────────────────────────────────
-- El servicio puede leer ítems activos (para el formulario público)
-- El admin puede leer todos (incluyendo inactivos)
CREATE POLICY items_select ON items
  FOR SELECT TO app_service
  USING (
    is_active = true
    OR current_setting('app.current_role', true) = 'admin'
  );

-- Solo admin puede crear/modificar/eliminar ítems del catálogo
CREATE POLICY items_insert ON items
  FOR INSERT TO app_service
  WITH CHECK (current_setting('app.current_role', true) = 'admin');

CREATE POLICY items_update ON items
  FOR UPDATE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY items_delete ON items
  FOR DELETE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: quotes ─────────────────────────────────────
-- Cualquier llamada de servicio puede insertar cotizaciones (formulario público)
CREATE POLICY quotes_insert ON quotes
  FOR INSERT TO app_service
  WITH CHECK (true);

-- Solo admin puede leer, modificar y eliminar cotizaciones
CREATE POLICY quotes_select ON quotes
  FOR SELECT TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY quotes_update ON quotes
  FOR UPDATE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY quotes_delete ON quotes
  FOR DELETE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: quote_items ────────────────────────────────
CREATE POLICY qitems_insert ON quote_items
  FOR INSERT TO app_service
  WITH CHECK (true);

CREATE POLICY qitems_select ON quote_items
  FOR SELECT TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY qitems_update ON quote_items
  FOR UPDATE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

CREATE POLICY qitems_delete ON quote_items
  FOR DELETE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: quote_status_log ───────────────────────────
-- El servicio inserta entradas de log al cambiar estado
CREATE POLICY log_insert ON quote_status_log
  FOR INSERT TO app_service
  WITH CHECK (true);

-- Solo admin puede leer el historial
CREATE POLICY log_select ON quote_status_log
  FOR SELECT TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: funnel_events ──────────────────────────────
-- El servicio inserta eventos del formulario público (sin autenticación)
CREATE POLICY funnel_insert ON funnel_events
  FOR INSERT TO app_service
  WITH CHECK (true);

-- Solo admin puede leer las métricas agregadas
CREATE POLICY funnel_select ON funnel_events
  FOR SELECT TO app_service
  USING (current_setting('app.current_role', true) = 'admin');

-- ── Políticas: site_content ───────────────────────────────
-- Lectura pública: el landing anónimo necesita poder leerlo
CREATE POLICY site_content_select ON site_content
  FOR SELECT TO app_service
  USING (true);

-- Solo admin puede editarlo (la fila se crea una vez por seed, no por la app)
CREATE POLICY site_content_update ON site_content
  FOR UPDATE TO app_service
  USING (current_setting('app.current_role', true) = 'admin');
