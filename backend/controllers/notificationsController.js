export const getAllNotifications = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { title, message, recipient_role, class_name, created_by } = req.body;
    const result = await req.db.query(
      'INSERT INTO notifications (title, message, recipient_role, class_name, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, message, recipient_role, class_name, created_by || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
