import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY created_at DESC');
    console.log(`📖 getAllMaterials returned ${result.rows.length} total materials`);
    result.rows.forEach((m, i) => {
      console.log(`  [${i}] id=${m.id}, title="${m.title}", class_level=${m.class_level}, section="${m.section}"`);
    });
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllMaterials:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get materials for a specific class and section (Student access)
 * Returns ONLY materials that match student's class AND section.
 * Access control:
 * - Returns materials targeted to student's section
 * - Returns materials shared across all sections (section IS NULL)
 * - NEVER returns materials targeted to different sections
 */
export const getClassMaterials = async (req, res) => {
    try {
        const { classLevel } = req.params;
        const section = req.query.section; // No default - must be provided

        console.log('🔍 getClassMaterials called:', { classLevel, section, allParams: req.params, allQuery: req.query });

        // Validate inputs - both classLevel and section are required
        if (!classLevel) {
            return res.status(400).json({ error: 'classLevel is required' });
        }
        if (!section) {
            return res.status(400).json({ error: 'section is required' });
        }

        // Query materials ONLY for this exact class and section combination
        // This prevents cross-section access
        const result = await req.db.query(
            `SELECT * FROM materials 
             WHERE class_level = $1 AND (section = $2 OR section IS NULL) 
             ORDER BY created_at DESC`,
            [classLevel, section]
        );

        console.log(`📚 getClassMaterials returned ${result.rows.length} materials for class=${classLevel}, section=${section}`);
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
    const section = sanitizeNullableText(req.body.section, 10);
    const subject = sanitizeText(req.body.subject, 100);
    const uploadedBy = sanitizeNullableText(req.user?.phone || req.body.uploadedBy || req.body.uploaded_by, 100);
    const uploadedById = req.user?.userId || null;
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;

    console.log('📝 createMaterial received:', { title, classLevel, section, subject, fileUrl, uploadedBy });

    // Enforce required fields including section
    if (!title || !classLevel || !section || !subject || !fileUrl) {
      return res.status(400).json({ 
        error: 'All fields required: title, classLevel, section, subject, and file. Section cannot be empty.' 
      });
    }

    const result = await req.db.query(
      `INSERT INTO materials (title, description, class_level, section, subject, file_url, uploaded_by, uploaded_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, classLevel, section || null, subject, fileUrl, uploadedBy || null, uploadedById]
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
        const section = sanitizeNullableText(req.body.section, 10);
        const subject = sanitizeText(req.body.subject, 100);
        let fileUrl = req.body.fileUrl || req.body.file_url; // Keep existing if no new file

        // Enforce section cannot be empty
        if (!section) {
            return res.status(400).json({ error: 'Section is required and cannot be empty' });
        }

        if (req.file) {
            fileUrl = `/uploads/materials/${req.file.filename}`;
        }

        const result = await req.db.query(
            `UPDATE materials 
             SET title = $1, description = $2, class_level = $3, section = $4, subject = $5, file_url = $6, updated_at = CURRENT_TIMESTAMP
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
