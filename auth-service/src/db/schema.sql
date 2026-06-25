-- ============================================================
-- United Mudanzas — Schema auth DB
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,  -- bcrypt hash
  role         VARCHAR(20) NOT NULL DEFAULT 'admin',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  totp_secret  VARCHAR(64),            -- secret TOTP en claro; protegido por RLS y acceso a la BD
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens almacenados para poder invalidarlos en logout
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
