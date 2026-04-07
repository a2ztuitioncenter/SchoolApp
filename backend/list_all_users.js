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

async function listAllUsers() {
  try {
    console.log('\n📋 FETCHING ALL USERS...\n');
    
    const result = await pool.query(`
      SELECT 
        id, 
        phone, 
        email, 
        role, 
        name, 
        "isActive", 
        "createdAt"
      FROM users 
      ORDER BY id
    `);

    if (result.rows.length === 0) {
      console.log('❌ No users found in database\n');
      process.exit(0);
    }

    console.log('=' .repeat(100));
    console.log('USER CREDENTIALS LIST');
    console.log('=' .repeat(100));
    console.log();

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'N/A'}`);
      console.log('─'.repeat(50));
      console.log(`   ID:        ${user.id}`);
      console.log(`   Phone:     ${user.phone}`);
      console.log(`   Email:     ${user.email || 'N/A'}`);
      console.log(`   Role:      ${user.role}`);
      console.log(`   Status:    ${user.isActive ? '✓ Active' : '✗ Inactive'}`);
      console.log(`   Created:   ${new Date(user.createdAt).toLocaleString()}`);
      console.log(`   Password:  [HASHED - Cannot be retrieved]`);
      console.log();
    });

    console.log('=' .repeat(100));
    console.log(`TOTAL USERS: ${result.rows.length}`);
    console.log('=' .repeat(100));
    console.log('\n⚠️  PASSWORDS ARE HASHED AND CANNOT BE RETRIEVED');
    console.log('💡 To reset a user password, use the admin dashboard or password reset feature\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

listAllUsers();
