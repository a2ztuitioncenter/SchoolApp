import express from 'express';
import { authenticate } from '../../middleware/auth-middleware.js';
import { sanitizeText } from '../../utils/sanitize.js';

const router = express.Router();

/**
 * Register or update a push token
 * POST /api/auth/push-token
 */
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { pushToken, deviceName, os } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const safePushToken = sanitizeText(pushToken, 255);
    const safeDeviceName = sanitizeText(deviceName || 'Unknown Device', 100);
    const safeOs = sanitizeText(os || 'unknown', 50);

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Insert or update token (upsert on conflict user_id + push_token)
    await req.db.query(
      `INSERT INTO user_push_tokens (user_id, push_token, device_name, os)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, push_token) 
       DO UPDATE SET device_name = $3, os = $4`,
      [parsedUserId, safePushToken, safeDeviceName, safeOs]
    );

    console.log(`[PushTokenAPI] Registered token for user ${parsedUserId} (${safeDeviceName}, ${safeOs})`);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    console.error('[PushTokenAPI] Registration error:', error.message);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * Unregister/remove a push token (on logout)
 * DELETE /api/auth/push-token
 */
router.delete('/push-token', authenticate, async (req, res) => {
  try {
    const { userId } = req.user;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    const safePushToken = sanitizeText(pushToken, 255);
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await req.db.query(
      'DELETE FROM user_push_tokens WHERE user_id = $1 AND push_token = $2',
      [parsedUserId, safePushToken]
    );

    console.log(`[PushTokenAPI] Unregistered token for user ${parsedUserId}`);
    res.json({ success: true, message: 'Push token unregistered successfully' });
  } catch (error) {
    console.error('[PushTokenAPI] Unregistration error:', error.message);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

export default router;
