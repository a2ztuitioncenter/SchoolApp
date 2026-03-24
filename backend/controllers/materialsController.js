export const getAllMaterials = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM materials ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const { title, description, class_name, subject, file_url, uploaded_by } = req.body;
    const result = await req.db.query(
      'INSERT INTO materials (title, description, class_name, subject, file_url, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, class_name, subject, file_url, uploaded_by || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM materials WHERE id = $1', [id]);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
