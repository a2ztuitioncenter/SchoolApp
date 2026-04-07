#!/usr/bin/env node

/**
 * test-connection.js
 * Tests all connection points: Frontend, Backend, Database
 * Run with: node test-connection.js
 */

import 'dotenv/config.js';

const tests = [];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const response = await fetch(url, { timeout: 5000 });
    if (response.status === expectedStatus) {
      log(`✅ ${name}: ${url}`, 'green');
      return true;
    } else {
      log(`⚠️  ${name}: Got status ${response.status}, expected ${expectedStatus}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`❌ ${name}: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tuition_app',
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version()');
    client.release();
    await pool.end();

    log(`✅ Database Connection: ${result.rows[0].current_time}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Database Connection: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('         TUITION APP - CONNECTION DIAGNOSTIC TEST', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  log('Testing Connections...\n', 'cyan');

  // Test Backend Health
  await testEndpoint(
    'Backend Health Check',
    'http://localhost:3000/health',
    200
  );

  // Test Frontend
  await testEndpoint(
    'Frontend Server',
    'http://localhost:8000',
    200
  );

  // Test API Proxy
  await testEndpoint(
    'API Proxy (from Frontend)',
    'http://localhost:8000/api/auth/check',
    400 // Might be 400 without proper auth, that's ok
  );

  // Test Database
  log('\nTesting Database...\n', 'cyan');
  await testDatabaseConnection();

  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('           DIAGNOSTIC TEST COMPLETE', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  log('Environment Configuration:', 'cyan');
  log(`  Backend Port: ${process.env.PORT || 3000}`, 'yellow');
  log(`  Frontend Port: ${process.env.FRONTEND_PORT || 8000}`, 'yellow');
  log(`  Database Host: ${process.env.DB_HOST || 'localhost'}`, 'yellow');
  log(`  Database Port: ${process.env.DB_PORT || 5432}`, 'yellow');
  log(`  Database Name: ${process.env.DB_NAME || 'tuition_app'}`, 'yellow');
  log('', 'reset');
}

runTests().catch((error) => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  process.exit(1);
});
