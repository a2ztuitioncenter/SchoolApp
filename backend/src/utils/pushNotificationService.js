import pool from '../config/pool.js';

/**
 * Service to handle sending push notifications via the Expo Push API.
 * Supports batching, custom data payloads, and automatic cleanup of stale/invalid tokens.
 */
export const pushNotificationService = {
  /**
   * Send a push notification to specific users
   * @param {number|number[]} userIds - Single user ID or array of user IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification message body
   * @param {object} data - Optional data payload for deep linking (e.g. { screen: 'DoubtDetails', doubtId: 5 })
   */
  async send(userIds, title, body, data = {}) {
    try {
      const ids = Array.isArray(userIds) ? userIds : [userIds];
      if (ids.length === 0) return;

      // 1. Fetch push tokens for these users
      const query = `
        SELECT push_token, user_id 
        FROM user_push_tokens 
        WHERE user_id = ANY($1)
      `;
      const res = await pool.query(query, [ids]);
      if (res.rows.length === 0) {
        console.log(`[PushService] No push tokens found for users: ${ids.join(', ')}`);
        return;
      }

      const tokens = res.rows.map(row => row.push_token);
      console.log(`[PushService] Found ${tokens.length} tokens for users: ${ids.join(', ')}. Sending notifications...`);

      // 2. Prepare Expo messages payload
      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        badge: 1, // Will increment client-side or prompt badge count
      }));

      // Expo Push API allows sending up to 100 messages at once
      const chunks = [];
      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        chunks.push(messages.slice(i, i + chunkSize));
      }

      for (const chunk of chunks) {
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });

          const result = await response.json();
          
          if (__DEV__ || true) {
            console.log('[PushService] Expo Send Response:', JSON.stringify(result, null, 2));
          }

          // 3. Clean up bad/stale tokens
          // Expo returns an array of tickets matching the order of chunked messages
          if (result.data && Array.isArray(result.data)) {
            const badTokens = [];
            
            result.data.forEach((ticket, idx) => {
              if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                badTokens.push(chunk[idx].to);
              }
            });

            if (badTokens.length > 0) {
              console.log(`[PushService] Pruning ${badTokens.length} unregistered device tokens...`);
              await pool.query(
                'DELETE FROM user_push_tokens WHERE push_token = ANY($1)',
                [badTokens]
              );
            }
          }
        } catch (fetchErr) {
          console.error('[PushService] Failed to post chunk to Expo API:', fetchErr.message);
        }
      }
    } catch (error) {
      console.error('[PushService] Unexpected push notification error:', error.message);
    }
  }
};
