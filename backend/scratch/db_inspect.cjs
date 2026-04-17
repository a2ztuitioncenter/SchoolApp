const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.aixsqujmuihrgeokhasa:a2ztuition.local2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });

async function inspect() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('--- TABLES ---');
    console.log(tables.rows.map(r => r.table_name));

    for (const table of tables.rows.map(r => r.table_name)) {
      const cols = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`\n--- SCHEMA: ${table} ---`);
      console.table(cols.rows);

      // Check for constraints (Primary keys, Foreign keys)
      const constraints = await pool.query(`
        SELECT conname, contype, pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE n.nspname = 'public' AND conrelid = $1::regclass
      `, [table]);
      console.log(`--- CONSTRAINTS: ${table} ---`);
      console.table(constraints.rows);
    }
  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await pool.end();
  }
}

inspect();
