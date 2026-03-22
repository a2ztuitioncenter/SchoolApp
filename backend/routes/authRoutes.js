import express from 'express';

const router = express.Router();

// Mock login endpoint for development
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  const pool = req.db;

  try {
    const userQuery = 'SELECT id, role FROM users WHERE phone = $1';
    const result = await pool.query(userQuery, [phone]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone number' });
    }

    res.json({ 
      success: true, 
      user: result.rows[0] 
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;