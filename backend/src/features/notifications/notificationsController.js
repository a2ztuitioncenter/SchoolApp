import { sanitizeIdentifier, sanitizeNullableText, sanitizeText } from '../../utils/sanitize.js';

export const getAllNotifications = async (req, res) => {
  try {
    const { userId, role } = req.user;
    
    let query = `
      SELECT n.*, u.name as creator_name 
      FROM notifications n 
      LEFT JOIN users u ON n.created_by = u.id
    `;
    let params = [];

    if (role === 'admin') {
      // Admins see everything
      query += ' ORDER BY created_at DESC';
    } else if (role === 'student') {
      // Students see ALL notices, or role=student notices, filtered by class/section
      const studentRes = await req.db.query(
        'SELECT class_level, section FROM students WHERE user_id = $1',
        [userId]
      );
      
      if (studentRes.rows.length > 0) {
        const { class_level, section } = studentRes.rows[0];
        query += `
          WHERE (recipient_role IS NULL OR LOWER(recipient_role) = 'all' OR LOWER(recipient_role) = 'student')
          AND (class_level IS NULL OR class_level = $1)
          AND (section IS NULL OR section = $2 OR section = 'ALL')
        `;
        params = [class_level, section];
      } else {
        query += " WHERE recipient_role IS NULL OR LOWER(recipient_role) = 'all'";
      }
      query += ' ORDER BY created_at DESC';
    } else {
      // Teachers and Staff see ALL notices, or notices specifically for their role
      query += `
        WHERE (recipient_role IS NULL OR LOWER(recipient_role) = 'all' OR LOWER(recipient_role) = $1)
        ORDER BY created_at DESC
      `;
      params = [role.toLowerCase()];
    }

    const result = await req.db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('getAllNotifications ERROR:', err.message);
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
    const createdBy = sanitizeIdentifier(req.user?.userId, 20);
    if (!createdBy) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!title || !message)
      return res.status(400).json({ error: 'title and message required' });

    const attachmentUrl = req.file ? `/uploads/notifications/${req.file.filename}` : null;
    const createdByInt = createdBy ? parseInt(createdBy, 10) : null;
    if (createdByInt !== null && Number.isNaN(createdByInt)) {
      return res.status(400).json({ error: 'Invalid createdBy identifier' });
    }

    const result = await req.db.query(
      `INSERT INTO notifications (title, message, attachment_url, recipient_role, class_level, section, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, message, attachmentUrl, recipientRole || null, classLevel || null, section || null, createdByInt]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
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
