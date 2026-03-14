CREATE TABLE IF NOT EXISTS audit_logs (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER,
  negocio_id   INTEGER,
  evento       VARCHAR(60)  NOT NULL,
  recurso      VARCHAR(100),
  recurso_id   VARCHAR(50),
  exitoso      BOOLEAN      NOT NULL,
  detalles     TEXT,
  ip_address   VARCHAR(45),
  user_agent   VARCHAR(300),
  request_id   VARCHAR(36),
  creado_en    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_evento
  ON audit_logs(evento);

CREATE INDEX IF NOT EXISTS idx_audit_logs_creado_en
  ON audit_logs(creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_negocio_id
  ON audit_logs(negocio_id)
  WHERE negocio_id IS NOT NULL;

COMMENT ON TABLE audit_logs IS
  'Registro inmutable de eventos de seguridad y operaciones sensibles.';
