import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY created_at DESC');
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
        const section = req.query.section || 'A';
        const result = await req.db.query(
            'SELECT * FROM materials WHERE class_level = $1 AND section = $2 ORDER BY created_at DESC',
            [classLevel, section]
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
    const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10) || 'A';
    const subject = sanitizeText(req.body.subject, 100);
    const uploadedBy = sanitizeNullableText(req.user?.phone || req.body.uploadedBy || req.body.uploaded_by, 100);
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;

    if (!title || !classLevel || !subject || !fileUrl) {
      return res.status(400).json({ error: 'title, classLevel, subject, and file are required' });
    }

    const result = await req.db.query(
      `INSERT INTO materials (title, description, class_level, section, subject, file_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, classLevel, section, subject, fileUrl, uploadedBy || null]
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
        const classLevel = sanitizeIdentifier(req.body.classLevel || req.body.class_level, 20);
        const section = sanitizeNullableText(req.body.section, 10) || 'A';
        const subject = sanitizeText(req.body.subject, 100);
        let fileUrl = req.body.fileUrl || req.body.file_url; // Keep existing if no new file

        if (req.file) {
            fileUrl = `/uploads/materials/${req.file.filename}`;
        }

        const result = await req.db.query(
            `UPDATE materials 
             SET title = $1, description = $2, class_level = $3, section = $4, subject = $5, file_url = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [title, description, classLevel, section, subject, fileUrl, id]
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
