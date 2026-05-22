import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Validate DATABASE_URL before creating pool
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not configured');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

async function exportDatabase() {
  let client;
  try {
    console.log('Attempting to connect to database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configured' : 'Not configured');
    
    client = await pool.connect();
    console.log('Connected to database...');

    // Get all table names
    const tableQuery = `
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    const tableResult = await client.query(tableQuery);
    const tables = tableResult.rows.map(row => row.tablename);
    
    console.log(`Found ${tables.length} tables`);

    let sqlContent = '';
    
    // Add header
    sqlContent += '-- PostgreSQL database export for tuition_app\n';
    sqlContent += `-- Generated on ${new Date().toISOString()}\n`;
    sqlContent += '-- Complete schema and data dump\n\n';
    
    // Drop existing tables (if importing to fresh database)
    sqlContent += '-- Drop existing tables\n';
    for (const table of tables) {
      sqlContent += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
    }
    sqlContent += '\n';

    // Export schema for each table
    console.log('Exporting schema...');
    for (const table of tables) {
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${table}' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const schemaResult = await client.query(schemaQuery);
      const columns = schemaResult.rows;
      
      // Get constraints
      const constraintQuery = `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = '${table}';
      `;
      const constraintResult = await client.query(constraintQuery);
      
      // Build CREATE TABLE statement
      let createStmt = `CREATE TABLE "${table}" (\n`;
      
      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        if (col.column_default) def += ` DEFAULT ${col.column_default}`;
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      });
      
      createStmt += columnDefs.join(',\n');
      
      // Add constraints
      const indexQuery = `
        SELECT indexdef FROM pg_indexes 
        WHERE tablename = '${table}' AND schemaname = 'public'
        AND indexname NOT LIKE '%_key' AND indexname NOT LIKE '%_pkey';
      `;
      const indexResult = await client.query(indexQuery);
      
      createStmt += '\n);\n\n';
      
      sqlContent += createStmt;
      
      // Add indexes
      for (const indexRow of indexResult.rows) {
        sqlContent += indexRow.indexdef + ';\n';
      }
      sqlContent += '\n';
    }

    // Export data for each table
    console.log('Exporting data...');
    for (const table of tables) {
      const dataQuery = `SELECT * FROM "${table}";`;
      const dataResult = await client.query(dataQuery);
      
      if (dataResult.rows.length > 0) {
        // Get column names
        const columns = Object.keys(dataResult.rows[0]);
        
        for (const row of dataResult.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
            if (Array.isArray(value)) return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
            return String(value);
          });
          
          sqlContent += `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        sqlContent += '\n';
      }
    }

    // Write to file
    const outputPath = path.join(__dirname, '../../tuition_app_complete_backup.sql');
    fs.writeFileSync(outputPath, sqlContent, 'utf8');
    
    console.log(`✓ Database exported successfully to: ${outputPath}`);
    console.log(`  File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('Export error:', error.message);
    console.error('Error details:', error);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

exportDatabase();
