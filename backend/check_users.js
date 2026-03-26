
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
  const res = await pool.query('SELECT u.phone, u.password, u.role, s.name FROM users u JOIN students s ON u.id = s."userId" LIMIT 2;');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
run();
