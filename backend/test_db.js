import pool from './pool.js';
async function test() {
    try {
        await pool.query(`ALTER TABLE fees ALTER COLUMN "userId" DROP NOT NULL`);
        console.log("Dropped NOT NULL constraint on userId");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
test();
