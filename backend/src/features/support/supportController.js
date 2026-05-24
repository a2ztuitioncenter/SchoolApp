import { MAP_TICKET } from './Support.js';

export const createTicket = async (req, res) => {
  const { subject, message } = req.body;
  const userId = req.user.userId;
  const pool = req.db;

  try {
    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, subject.trim(), message.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      data: MAP_TICKET(result.rows[0])
    });
  } catch (error) {
    console.error('[SUPPORT] Create Ticket Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit support ticket' });
  }
};

export const getTickets = async (req, res) => {
  const userId = req.user.userId;
  const pool = req.db;

  try {
    const result = await pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows.map(MAP_TICKET)
    });
  } catch (error) {
    console.error('[SUPPORT] Get Tickets Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve support tickets' });
  }
};
