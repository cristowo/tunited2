-- ============================================================
-- United Mudanzas — Schema completo (main DB)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Catálogo de muebles / ítems
-- ------------------------------------------------------------
CREATE TABLE items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category     VARCHAR(100) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  dimensions   VARCHAR(100),          -- Ej: "2.00 × 1.80 m"
  description  TEXT,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (category, name)
);

-- ------------------------------------------------------------
-- Cotizaciones (cabecera)
-- ------------------------------------------------------------
CREATE TABLE quotes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cliente
  client_name               VARCHAR(255) NOT NULL,
  client_email              VARCHAR(255) NOT NULL,
  client_phone              VARCHAR(30),

  -- Mudanza
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

  -- Estado
  status                    VARCHAR(30) DEFAULT 'pending'
                            CHECK (status IN ('pending','reviewed','quoted','confirmed','cancelled')),
  admin_notes               TEXT,
  estimated_price           NUMERIC(10,2),

  -- Consentimiento (Ley 21.719 Chile)
  consent_accepted          BOOLEAN NOT NULL DEFAULT false,
  consent_text              TEXT,
  consent_accepted_at       TIMESTAMP,

  -- Timestamps
  created_at                TIMESTAMP DEFAULT NOW(),
  updated_at                TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Ítems de cada cotización
-- ------------------------------------------------------------
CREATE TABLE quote_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Ítem del catálogo (NULL si es personalizado)
  item_id       UUID REFERENCES items(id),

  -- Ítem personalizado (NULL si es del catálogo)
  custom_name   VARCHAR(255),
  custom_m3     NUMERIC(6,2),

  -- Campos comunes
  quantity      INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_fragile    BOOLEAN DEFAULT false,
  notes         TEXT,

  CONSTRAINT chk_item_source CHECK (
    (item_id IS NOT NULL AND custom_name IS NULL AND custom_m3 IS NULL)
    OR
    (item_id IS NULL AND custom_name IS NOT NULL)
  )
);

-- ------------------------------------------------------------
-- Historial de cambios de estado
-- ------------------------------------------------------------
CREATE TABLE quote_status_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  old_status  VARCHAR(30),
  new_status  VARCHAR(30) NOT NULL,
  changed_by  UUID,               -- referencia opcional al usuario admin
  changed_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Eventos del embudo del cotizador público (/cotizar)
-- ------------------------------------------------------------
-- Qué paso vio cada sesión y si llegó a enviar, para medir abandono.
-- No contiene datos personales, solo un session_id generado en el cliente.
CREATE TABLE funnel_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  step       SMALLINT NOT NULL,
  event      VARCHAR(20) NOT NULL CHECK (event IN ('step_viewed', 'submitted')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Contenido editable del landing público
-- ------------------------------------------------------------
-- Fila única (id=1), editada desde el panel admin (hero, servicios,
-- portafolio, contacto, etc.)
CREATE TABLE site_content (
  id         INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content    JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Índices útiles
-- ------------------------------------------------------------
CREATE INDEX idx_quotes_status    ON quotes(status);
CREATE INDEX idx_quotes_email     ON quotes(client_email);
CREATE INDEX idx_quotes_created   ON quotes(created_at DESC);
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_funnel_events_step_event ON funnel_events(step, event);
