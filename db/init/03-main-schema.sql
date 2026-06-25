\connect main_db

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    VARCHAR(100) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  dimensions  VARCHAR(100),
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS quotes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name               VARCHAR(255) NOT NULL,
  client_email              VARCHAR(255) NOT NULL,
  client_phone              VARCHAR(30),
  move_date                 DATE,
  origin_address            TEXT NOT NULL,
  origin_is_apartment       BOOLEAN DEFAULT false,
  origin_floor              INT DEFAULT 0,
  origin_elevator           BOOLEAN DEFAULT false,
  origin_truck_distance_m   INT DEFAULT 0,
  dest_address              TEXT NOT NULL,
  dest_is_apartment         BOOLEAN DEFAULT false,
  dest_floor                INT DEFAULT 0,
  dest_elevator             BOOLEAN DEFAULT false,
  dest_truck_distance_m     INT DEFAULT 0,
  notes                     TEXT,
  status                    VARCHAR(30) DEFAULT 'pending'
                            CHECK (status IN ('pending','reviewed','quoted','confirmed','cancelled')),
  admin_notes               TEXT,
  estimated_price           NUMERIC(10,2),
  consent_accepted          BOOLEAN NOT NULL DEFAULT false,
  consent_text              TEXT,
  consent_accepted_at       TIMESTAMP,
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quote_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_id      UUID REFERENCES items(id),
  custom_name  VARCHAR(255),
  custom_m3    NUMERIC(6,2),
  quantity     INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_fragile   BOOLEAN DEFAULT false,
  notes        TEXT,
  CONSTRAINT chk_item_source CHECK (
    (item_id IS NOT NULL AND custom_name IS NULL AND custom_m3 IS NULL)
    OR
    (item_id IS NULL AND custom_name IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS quote_status_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  old_status  VARCHAR(30),
  new_status  VARCHAR(30) NOT NULL,
  changed_by  UUID,
  changed_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_status   ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_email    ON quotes(client_email);
CREATE INDEX IF NOT EXISTS idx_quotes_created  ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- Eventos del embudo del cotizador público (/cotizar): qué paso vio cada
-- sesión y si llegó a enviar, para medir abandono. Sin datos personales.
CREATE TABLE IF NOT EXISTS funnel_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  step       SMALLINT NOT NULL,
  event      VARCHAR(20) NOT NULL CHECK (event IN ('step_viewed', 'submitted')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_step_event ON funnel_events(step, event);

-- Contenido editable del landing público (hero, servicios, portafolio,
-- contacto, etc.) — fila única, editada desde el panel admin.
CREATE TABLE IF NOT EXISTS site_content (
  id         INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content    JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
