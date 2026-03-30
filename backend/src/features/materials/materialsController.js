export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY "createdAt" DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllMaterials:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
};

export const createMaterial = async (req, res) => {
  try {
    const { title, description, classLevel, subject, uploadedBy } = req.body;
    const fileUrl = req.file ? `/uploads/materials/${req.file.filename}` : null;

    if (!title || !classLevel || !subject || !fileUrl) {
      return res.status(400).json({ error: 'title, classLevel, subject, and file are required' });
    }

    const result = await req.db.query(
      `INSERT INTO materials (title, description, "classLevel", subject, "fileUrl", "uploadedBy")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, classLevel, subject, fileUrl, uploadedBy || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createMaterial:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, classLevel, subject } = req.body;
        let fileUrl = req.body.fileUrl; // Keep existing if no new file

        if (req.file) {
            fileUrl = `/uploads/materials/${req.file.filename}`;
        }

        const result = await req.db.query(
            `UPDATE materials 
             SET title = $1, description = $2, "classLevel" = $3, subject = $4, "fileUrl" = $5, "updatedAt" = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [title, description, classLevel, subject, fileUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }

        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('updateMaterial:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
};

export const deleteMaterial = async (req, res) => {
  try {
    await req.db.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    console.error('deleteMaterial:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
