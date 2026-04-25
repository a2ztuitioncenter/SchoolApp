// backend/src/utils/cleanupJob.js

/**
 * Starts a background job to periodically clean up expired assignments.
 * - Daily Practice Problems (DPP) are deleted 24 hours after creation.
 * - Homework is deleted 7 days after creation.
 * 
 * @param {import('pg').Pool} pool - The PostgreSQL database pool.
 */
export function startCleanupJob(pool) {
  // Run the cleanup immediately on startup, and then every 1 hour (3600000 ms)
  const INTERVAL_MS = 60 * 60 * 1000;

  const runCleanup = async () => {
    try {
      // 1. Delete DPPs older than 24 hours
      const dppResult = await pool.query(`
        DELETE FROM homework 
        WHERE type = 'daily_practice' 
        AND created_at < NOW() - INTERVAL '24 hours'
      `);
      if (dppResult.rowCount > 0) {
        console.log(`[Cleanup Job] Deleted ${dppResult.rowCount} expired Daily Practice Problems (DPP).`);
      }

      // 2. Delete Homeworks older than 7 days
      const hwResult = await pool.query(`
        DELETE FROM homework 
        WHERE type = 'homework' 
        AND created_at < NOW() - INTERVAL '7 days'
      `);
      if (hwResult.rowCount > 0) {
        console.log(`[Cleanup Job] Deleted ${hwResult.rowCount} expired Homework assignments.`);
      }

    } catch (error) {
      console.error('[Cleanup Job] Failed to run database cleanup:', error.message);
    }
  };

  // Run immediately once
  runCleanup();

  // Then schedule to run periodically
  setInterval(runCleanup, INTERVAL_MS);
  
  console.log('[Cleanup Job] Scheduled expired assignment cleanup (every hour).');
}
