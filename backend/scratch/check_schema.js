import pool from '../src/config/pool.js';
pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('subjects', 'subject_assignments');`)
  .then(r => { console.log(r.rows); process.exit(0); })
  .catch(console.error);
