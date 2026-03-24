export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY "createdAt" DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllMaterials:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const { title, description, classLevel, subject, fileUrl, uploadedBy } = req.body;
    if (!title || !classLevel || !subject || !fileUrl)
      return res.status(400).json({ error: 'title, classLevel, subject, fileUrl required' });
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

export const deleteMaterial = async (req, res) => {
  try {
    await req.db.query('DELETE FROM materials WHERE id = $1', [req.params.id]);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    console.error('deleteMaterial:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
