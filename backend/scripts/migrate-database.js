import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Hardcoded target database connection string as requested by the user
const TARGET_DATABASE_URL = 'postgresql://postgres.jidjwuxuhhsugtyoiugr:a2ztuition.local@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const BACKUP_FILE_PATH = path.join(__dirname, '../../tuition_app_complete_backup.sql');

async function runMigration() {
  console.log('🚀 Starting Database Migration to New Supabase DB...');
  console.log(`Target URL: ${TARGET_DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);
  console.log(`Backup File: ${BACKUP_FILE_PATH}`);

  if (!fs.existsSync(BACKUP_FILE_PATH)) {
    console.error('❌ Error: Backup file not found at path:', BACKUP_FILE_PATH);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(BACKUP_FILE_PATH, 'utf8');
  console.log(`✓ Backup file read successfully. Size: ${(sqlContent.length / 1024).toFixed(2)} KB`);

  const pool = new Pool({
    connectionString: TARGET_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✓ Successfully connected to the target database!');

    // 1. Extract and create missing sequences
    const seqRegex = /nextval\('"?(\w+)"?'::regclass\)/g;
    const sequences = new Set();
    let match;
    while ((match = seqRegex.exec(sqlContent)) !== null) {
      sequences.add(match[1]);
    }

    console.log(`Found ${sequences.size} sequences in backup. Creating sequences...`);
    await client.query('BEGIN');
    for (const seq of sequences) {
      await client.query(`DROP SEQUENCE IF EXISTS "${seq}" CASCADE;`);
      await client.query(`CREATE SEQUENCE "${seq}";`);
    }
    await client.query('COMMIT');
    console.log('✓ All sequences created successfully!');

    // 2. Restore tables and data
    console.log('⏳ Running restore script on target database...');
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query('COMMIT');
    console.log('✓ Schema and data restored successfully!');

    // 3. Sync sequences to match max imported IDs
    console.log('🔄 Syncing sequences to match max imported IDs...');
    await client.query('BEGIN');
    for (const seq of sequences) {
      if (seq.endsWith('_id_seq')) {
        const table = seq.replace('_id_seq', '');
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = $1
          );
        `, [table]);
        
        if (tableCheck.rows[0].exists) {
          await client.query(`ALTER SEQUENCE "${seq}" OWNED BY "${table}"."id";`);
          await client.query(`
            SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false);
          `);
        }
      }
    }
    await client.query('COMMIT');
    console.log('✓ All sequences synchronized successfully!');

    // Verification step
    console.log('🔍 Verifying restored tables and record counts...');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`\n📊 Verification Summary (Target Database):`);
    console.log('-------------------------------------------');
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
      console.log(`  - ${row.table_name}: ${countRes.rows[0].count} records`);
    }
    console.log('-------------------------------------------');
    console.log('✅ Migration and verification completed successfully!');

  } catch (err) {
    if (client) {
      console.log('⚠️ Attempting to rollback...');
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Failed to rollback transaction:', rollbackErr.message);
      }
    }
    console.error('❌ Migration Failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigration();
