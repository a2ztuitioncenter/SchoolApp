/**
 * Material.js - Model schema for Study Materials
 */
export const materialModel = {
  schema: `
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      "classLevel" VARCHAR(50) NOT NULL,
      section VARCHAR(50),
      subject VARCHAR(100) NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "uploadedBy" VARCHAR(100),
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
};
