export const auditLogModel = {
  table: 'audit_logs',
  schema: `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity VARCHAR(100),
      entity_id INTEGER,
      details JSONB,
      school_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  // Migration to add school_id if missing from legacy tables
  migration: `
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='school_id') THEN
        ALTER TABLE audit_logs ADD COLUMN school_id VARCHAR(50);
      END IF;
    END $$;
  `
};
