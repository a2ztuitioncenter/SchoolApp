export const storageModel = {
  table: 'app_files',
  schema: `
    CREATE TABLE IF NOT EXISTS app_files (
      id SERIAL PRIMARY KEY,
      drive_file_id VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      class_level VARCHAR(50),
      section VARCHAR(50),
      uploaded_by INTEGER REFERENCES users(id),
      file_type VARCHAR(50), -- study_material, homework, assignment
      mime_type VARCHAR(100),
      file_size BIGINT,
      web_view_link TEXT,
      download_link TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `
};
