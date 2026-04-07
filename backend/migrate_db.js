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

    // Check homework table and migrate columns if needed
    const homeworkTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'homework'
      );
    `);

    if (homeworkTableCheck.rows[0].exists) {
      console.log('✓ Homework table exists');

      // Rename 'assignedBy' to 'teacherId' if it exists
      const assignedByColumnExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'homework' AND column_name = 'assignedBy'
        );
      `);

      if (assignedByColumnExists.rows[0].exists) {
        console.log('→ Renaming "assignedBy" column to "teacherId"...');
        await pool.query(`ALTER TABLE homework RENAME COLUMN "assignedBy" TO "teacherId"`);
        console.log('✓ Renamed assignedBy → teacherId');
      } else {
        console.log('✓ teacherId column already exists');
      }

      // Add 'attachmentUrl' column if missing
      const attachmentUrlExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'homework' AND column_name = 'attachmentUrl'
        );
      `);

      if (!attachmentUrlExists.rows[0].exists) {
        console.log('→ Adding "attachmentUrl" column...');
        await pool.query(`ALTER TABLE homework ADD COLUMN "attachmentUrl" VARCHAR(500)`);
        console.log('✓ Added attachmentUrl column');
      } else {
        console.log('✓ attachmentUrl column already exists');
      }

      // Add 'section' column if missing
      const sectionExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'homework' AND column_name = 'section'
        );
      `);

      if (!sectionExists.rows[0].exists) {
        console.log('→ Adding "section" column...');
        await pool.query(`ALTER TABLE homework ADD COLUMN section VARCHAR(10)`);
        console.log('✓ Added section column');
      } else {
        console.log('✓ section column already exists');
      }

      // Add 'type' column if missing
      const typeExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'homework' AND column_name = 'type'
        );
      `);

      if (!typeExists.rows[0].exists) {
        console.log('→ Adding "type" column with default...');
        await pool.query(`ALTER TABLE homework ADD COLUMN type VARCHAR(50) DEFAULT 'homework'`);
        console.log('✓ Added type column');
      } else {
        console.log('✓ type column already exists');
      }
    }

    // Check materials table and migrate columns if needed
    const materialsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'materials'
      );
    `);

    if (materialsTableCheck.rows[0].exists) {
      console.log('✓ Materials table exists');

      // Check if uploadedBy is INTEGER (old schema) and convert to VARCHAR
      const uploadedByColInfo = await pool.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'materials' AND column_name = 'uploadedBy'
      `);

      if (uploadedByColInfo.rows.length > 0 && uploadedByColInfo.rows[0].data_type === 'integer') {
        console.log('→ Fixing "uploadedBy" column type from integer to varchar...');
        try {
          // First, remove the foreign key constraint
          const constraints = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name='materials' AND constraint_type='FOREIGN KEY'
          `);
          
          for (const constraint of constraints.rows) {
            await pool.query(`ALTER TABLE materials DROP CONSTRAINT "${constraint.constraint_name}"`);
          }
          
          // Change column type to VARCHAR
          await pool.query(`
            ALTER TABLE materials 
            ALTER COLUMN "uploadedBy" TYPE VARCHAR(100)
          `);
          console.log('✓ Fixed uploadedBy column type to VARCHAR(100)');
        } catch (e) {
          console.log('⚠️  Error fixing uploadedBy:', e.message);
        }
      } else {
        console.log('✓ uploadedBy column already correct');
      }

      // Add 'updatedAt' column if missing
      const updatedAtExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'materials' AND column_name = 'updatedAt'
        );
      `);

      if (!updatedAtExists.rows[0].exists) {
        console.log('→ Adding "updatedAt" column...');
        await pool.query(`ALTER TABLE materials ADD COLUMN "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log('✓ Added updatedAt column');
      } else {
        console.log('✓ updatedAt column already exists');
      }
    }

    // Check users table and add name column if needed
    const usersTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (usersTableCheck.rows[0].exists) {
      console.log('✓ Users table exists');

      // Add 'name' column if missing
      const nameExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'name'
        );
      `);

      if (!nameExists.rows[0].exists) {
        console.log('→ Adding "name" column...');
        await pool.query(`ALTER TABLE users ADD COLUMN name VARCHAR(100)`);
        console.log('✓ Added name column');
      } else {
        console.log('✓ name column already exists');
      }
    }

    // Check notifications table and add attachmentUrl column if needed
    const notificationsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
      );
    `);

    if (notificationsTableCheck.rows[0].exists) {
      console.log('✓ Notifications table exists');

      // Add 'attachmentUrl' column if missing
      const attachmentUrlExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'notifications' AND column_name = 'attachmentUrl'
        );
      `);

      if (!attachmentUrlExists.rows[0].exists) {
        console.log('→ Adding "attachmentUrl" column...');
        await pool.query(`ALTER TABLE notifications ADD COLUMN "attachmentUrl" TEXT`);
        console.log('✓ Added attachmentUrl column');
      } else {
        console.log('✓ attachmentUrl column already exists');
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
