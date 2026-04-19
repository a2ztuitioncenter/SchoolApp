export const materialModel = {
  schema: `
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      class_level VARCHAR(50) NOT NULL,
      section VARCHAR(50),
      subject VARCHAR(100) NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_by VARCHAR(100),
      uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_materials_uploaded_by_id ON materials(uploaded_by_id);
    CREATE INDEX IF NOT EXISTS idx_materials_class_section ON materials(class_level, section);
  `
};
