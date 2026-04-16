import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllNotifications = async (req, res) => {
  try {
    const result = await req.db.query('SELECT * FROM notifications ORDER BY "createdAt" DESC');
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
    const recipientRole = sanitizeNullableText(req.body.recipientRole, 50);
    const classLevel = sanitizeNullableText(req.body.classLevel, 20);
    const createdBy = sanitizeIdentifier(req.user?.userId || req.body.createdBy, 20);
    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' });

    const attachmentUrl = req.file ? `/uploads/notifications/${req.file.filename}` : null;
    const createdByInt = createdBy ? parseInt(createdBy, 10) : null;

    console.log('Creating notification with:', { title, message, attachmentUrl, recipientRole, classLevel, createdByInt });

    const result = await req.db.query(
      `INSERT INTO notifications (title, message, "attachmentUrl", "recipientRole", "classLevel", "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, message, attachmentUrl, recipientRole || null, classLevel || null, createdByInt]
    );
    console.log('Notification created successfully:', result.rows[0].id);
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('createNotification ERROR:', err.message);
    console.error('SQL State:', err.code);
    console.error('Detail:', err.detail);
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
