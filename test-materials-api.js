import db from './backend/src/config/database.js';

async function testQuery() {
  try {
    // Test query for section B
    console.log('\n=== TEST: Query for Class 10, Section B ===');
    const resultB = await db.query(
      'SELECT id, title, class_level, section FROM materials WHERE class_level = $1 AND (section = $2 OR section IS NULL) ORDER BY created_at DESC',
      ['10', 'B']
    );
    console.log(`Results for section B (${resultB.rows.length} items):`);
    resultB.rows.forEach(r => {
      console.log(`  - ID ${r.id}: "${r.title}" (section: ${r.section})`);
    });

    // Test query for section A
    console.log('\n=== TEST: Query for Class 10, Section A ===');
    const resultA = await db.query(
      'SELECT id, title, class_level, section FROM materials WHERE class_level = $1 AND (section = $2 OR section IS NULL) ORDER BY created_at DESC',
      ['10', 'A']
    );
    console.log(`Results for section A (${resultA.rows.length} items):`);
    resultA.rows.forEach(r => {
      console.log(`  - ID ${r.id}: "${r.title}" (section: ${r.section})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testQuery();
