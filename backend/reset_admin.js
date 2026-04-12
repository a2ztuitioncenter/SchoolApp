import pool from './src/config/pool.js';
import bcrypt from 'bcryptjs';

(async () => {
    try {
        const hashedPassword = await bcrypt.hash('muslim', 10);
        await pool.query(
            `UPDATE users SET password = $1, role = 'admin', "isActive" = true WHERE phone = '7086795477'`,
            [hashedPassword]
        );
        console.log('Admin password manually reset to: muslim');
    } catch (err) {
        console.error('Failed:', err);
    } finally {
        pool.end();
        process.exit(0);
    }
})();
