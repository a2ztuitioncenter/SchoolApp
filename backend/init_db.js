import pool from './database.js'; // Ensure your connection pool is imported
import { initializeDatabase } from './database.js';

async function setupDatabase() {
  try {
    console.log('🚀 Starting database setup process...');
    
    // Create the tables using your database.js file
    await initializeDatabase(pool);
    
    console.log('✅ Database setup completed successfully!');
    console.log('\n📝 Admin Credentials:');
    console.log(`   Phone: ${process.env.ADMIN_PHONE || '9999999999'}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log('\n⚠️  Change these credentials in .env before production!\n');
    
    process.exit(0); // Exit successfully
    
  } catch (err) {
    console.error('❌ Fatal error during database setup:', err);
    process.exit(1); // Exit with an error code
  }
}

// Run the function
setupDatabase();