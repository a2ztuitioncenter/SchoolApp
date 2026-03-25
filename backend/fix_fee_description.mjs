import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,user:'postgres',password:'123456',database:'tuition_app'});
(async () => {
  try {
    await pool.query(`ALTER TABLE fees ADD COLUMN IF NOT EXISTS description VARCHAR(200)`);
    console.log('SUCCESS: description column added to fees table (if it was missing)');
  } catch (e) {
    console.error('ERROR adding description column:', e.message);
  } finally {
    await pool.end();
  }
})();
