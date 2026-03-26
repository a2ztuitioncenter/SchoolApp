
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pkg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tuition_app',
});

async function run() {
  try {
      const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications';");
      console.log('--- Table: notifications ---');
      console.log(JSON.stringify(res.rows, null, 2));
      
      const count = await pool.query("SELECT COUNT(*) FROM notifications;");
      console.log('Total notifications:', count.rows[0].count);
  } catch (err) {
      console.error('Error:', err.message);
  }
  process.exit(0);
}
run();
