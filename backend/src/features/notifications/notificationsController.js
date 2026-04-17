import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllNotifications = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM notifications ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('getAllNotifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const title = sanitizeText(req.body.title, 200);
    const message = sanitizeText(req.body.message, 5000);
    const recipientRole = sanitizeNullableText(req.body.recipientRole || req.body.recipient_role, 50);
    const classLevel = sanitizeNullableText(req.body.classLevel || req.body.class_level, 20);
    const section = sanitizeNullableText(req.body.section, 10);
    const createdBy = sanitizeIdentifier(req.user?.userId || req.body.createdBy || req.body.created_by, 20);
    
    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' });

    const attachmentUrl = req.file ? `/uploads/notifications/${req.file.filename}` : null;
    const createdByInt = createdBy ? parseInt(createdBy, 10) : null;

    const result = await req.db.query(
      `INSERT INTO notifications (title, message, attachment_url, recipient_role, class_level, section, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, message, attachmentUrl, recipientRole || null, classLevel || null, section || null, createdByInt]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createNotification ERROR:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query('DELETE FROM notifications WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteNotification:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
