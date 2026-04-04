import pool from './src/config/database.js';

/**
 * Migration script to fix database schema issues
 * Run this if you're getting "column does not exist" errors
 */
async function migrateDatabase() {
  try {
    console.log('🔧 Starting database migration...\n');

    // Check if fees table exists and has the correct columns
    const feesTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'fees'
      );
    `);

    if (feesTableCheck.rows[0].exists) {
      console.log('✓ Fees table exists');

      // Rename 'paid' column to '"isPaid"' if it exists
      const paidColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'fees' AND column_name = 'paid'
        );
      `);

      if (paidColumnExists.rows[0].exists) {
        console.log('→ Renaming "paid" column to "isPaid"...');
        await pool.query(`ALTER TABLE fees RENAME COLUMN paid TO "isPaid"`);
        console.log('✓ Renamed paid → isPaid');
      }

      // Add 'description' column if missing
      const descColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'fees' AND column_name = 'description'
        );
      `);

      if (!descColumnExists.rows[0].exists) {
        console.log('→ Adding "description" column...');
        await pool.query(`ALTER TABLE fees ADD COLUMN description VARCHAR(200)`);
        console.log('✓ Added description column');
      } else {
        console.log('✓ Description column already exists');
      }

      // Check if paidDate column exists, add if missing
      const paidDateColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'fees' AND column_name = 'paidDate'
        );
      `);

      if (!paidDateColumnExists.rows[0].exists) {
        console.log('→ Adding "paidDate" column...');
        await pool.query(`ALTER TABLE fees ADD COLUMN "paidDate" DATE`);
        console.log('✓ Added paidDate column');
      } else {
        console.log('✓ PaidDate column already exists');
      }
    }

    console.log('\n✅ Database migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\nTo resolve this issue:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Verify database credentials in .env');
    console.error('3. You may need to drop and recreate the database');
    console.error('   $ npx node init_db.js');
    process.exit(1);
  }
}

migrateDatabase();
