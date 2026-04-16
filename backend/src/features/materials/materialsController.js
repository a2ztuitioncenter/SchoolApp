import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY "createdAt" DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllMaterials:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get materials for a specific class (Student access)
 */
export const getClassMaterials = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const result = await req.db.query(
            'SELECT * FROM materials WHERE "classLevel" = $1 ORDER BY "createdAt" DESC',
            [classLevel]
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error('getClassMaterials:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createMaterial = async (req, res) => {
  try {
    const title = sanitizeText(req.body.title, 200);
    const description = sanitizeNullableText(req.body.description, 5000);
    const classLevel = sanitizeIdentifier(req.body.classLevel, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);
    const uploadedBy = sanitizeNullableText(req.user?.phone || req.body.uploadedBy, 100);
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;

    if (!title || !classLevel || !subject || !fileUrl) {
      return res.status(400).json({ error: 'title, classLevel, subject, and file are required' });
    }

    const result = await req.db.query(
      `INSERT INTO materials (title, description, "classLevel", section, subject, "fileUrl", "uploadedBy")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, classLevel, section || null, subject, fileUrl, uploadedBy || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createMaterial:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const title = sanitizeText(req.body.title, 200);
        const description = sanitizeNullableText(req.body.description, 5000);
        const classLevel = sanitizeIdentifier(req.body.classLevel, 20);
        const section = sanitizeNullableText(req.body.section, 10);
        const subject = sanitizeText(req.body.subject, 100);
        let fileUrl = req.body.fileUrl; // Keep existing if no new file

        if (req.file) {
            fileUrl = `/uploads/materials/${req.file.filename}`;
        }

        const result = await req.db.query(
            `UPDATE materials 
             SET title = $1, description = $2, "classLevel" = $3, section = $4, subject = $5, "fileUrl" = $6, "updatedAt" = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [title, description, classLevel, section || null, subject, fileUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('updateMaterial:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteMaterial = async (req, res) => {
  try {
    await req.db.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    console.error('deleteMaterial:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
