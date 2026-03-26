export const getAllNotifications = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM notifications ORDER BY "createdAt" DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllNotifications:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { title, message, recipientRole, classLevel, createdBy } = req.body;
    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' });

    const attachmentUrl = req.file ? `/uploads/notifications/${req.file.filename}` : null;

    const result = await req.db.query(
      `INSERT INTO notifications (title, message, "attachmentUrl", "recipientRole", "classLevel", "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, message, attachmentUrl, recipientRole || null, classLevel || null, createdBy || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createNotification:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteNotification:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
