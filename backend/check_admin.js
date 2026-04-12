import pool from './src/config/pool.js';
(async () => {
  const res = await pool.query("SELECT id, phone, role, password, \"isActive\" FROM users WHERE role = 'admin'");
  console.log(res.rows);
  process.exit(0);
})();
