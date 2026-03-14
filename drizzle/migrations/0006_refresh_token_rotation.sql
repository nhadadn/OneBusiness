ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);

COMMENT ON COLUMN usuarios.refresh_token_hash IS
  'SHA-256 hex del refresh token activo. NULL = sin sesión o revocado.';
