import pool from './database.js'; // Ensure your connection pool is imported
import { initializeDatabase, seedDatabase } from './database.js';

async function setupDatabase() {
  try {
    console.log(' Starting database setup process...');
    
    // 1. Create the tables using your database.js file
    await initializeDatabase(pool);
    
    // 2. Populate the tables with your sample data
    await seedDatabase(pool);
    
    console.log(' Database setup and seeding completely finished!');
    process.exit(0); // Exit successfully
    
  } catch (err) {
    console.error(' Fatal error during database setup:', err);
    process.exit(1); // Exit with an error code
  }
}

// Run the function
setupDatabase();