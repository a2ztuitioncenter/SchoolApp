export const materialModel = {
  schema: `
    CREATE TABLE IF NOT EXISTS academic_classes (
      id SERIAL PRIMARY KEY,
      class_name VARCHAR(50) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS academic_sections (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
      section_name VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(class_id, section_name)
    );

    CREATE TABLE IF NOT EXISTS study_materials (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      class_id INTEGER NOT NULL REFERENCES academic_classes(id) ON DELETE RESTRICT,
      section_id INTEGER REFERENCES academic_sections(id) ON DELETE SET NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      uploader_role VARCHAR(20) NOT NULL CHECK (uploader_role IN ('admin', 'teacher')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_study_materials_class_section ON study_materials(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_study_materials_uploaded_by ON study_materials(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_study_materials_created_at ON study_materials(created_at DESC);

    -- Backward-safe migration from the legacy materials table if it exists.
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'materials'
      ) THEN
        INSERT INTO academic_classes (class_name)
        SELECT DISTINCT m.class_level
        FROM materials m
        WHERE m.class_level IS NOT NULL
        ON CONFLICT (class_name) DO NOTHING;

        INSERT INTO academic_sections (class_id, section_name)
        SELECT DISTINCT ac.id, m.section
        FROM materials m
        JOIN academic_classes ac ON ac.class_name = m.class_level
        WHERE m.section IS NOT NULL AND m.section <> ''
        ON CONFLICT (class_id, section_name) DO NOTHING;

        INSERT INTO study_materials (
          id,
          title,
          description,
          file_url,
          class_id,
          section_id,
          uploaded_by,
          uploader_role,
          created_at,
          updated_at
        )
        SELECT
          m.id,
          m.title,
          m.description,
          m.file_url,
          ac.id,
          s.id,
          COALESCE(m.uploaded_by_id, 1),
          CASE
            WHEN u.role = 'teacher' THEN 'teacher'
            ELSE 'admin'
          END,
          COALESCE(m.created_at, CURRENT_TIMESTAMP),
          COALESCE(m.updated_at, CURRENT_TIMESTAMP)
        FROM materials m
        JOIN academic_classes ac ON ac.class_name = m.class_level
        LEFT JOIN academic_sections s
          ON s.class_id = ac.id
         AND s.section_name = m.section
        LEFT JOIN users u ON u.id = m.uploaded_by_id
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END $$;
  `
};
