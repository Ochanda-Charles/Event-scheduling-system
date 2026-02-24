/**
 * MIGRATION: Add missing columns to existing tables
 * --------------------------------------------------
 * The init.sql added updated_at to the schema, but the tables
 * were originally created without it. This script safely adds
 * the missing columns using ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
 *
 * Run with:  node db/migrate_alter.js
 */

require('dotenv').config();
const db = require('../config/database');

async function run() {
    console.log('🔄 Running ALTER migration...\n');

    const alterStatements = [
        // Add updated_at to users
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
        // Add updated_at to organizations
        `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
        // Add updated_at to bookings
        `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    ];

    for (const sql of alterStatements) {
        try {
            await db.query(sql);
            const table = sql.match(/ALTER TABLE (\w+)/)[1];
            console.log(`  ✅ ${table}.updated_at — OK`);
        } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
        }
    }

    // Verify all columns exist
    console.log('\n📋 Verifying columns...');
    const check = await db.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'updated_at'
        ORDER BY table_name
    `);
    check.rows.forEach(r => console.log(`  ✅ ${r.table_name}.updated_at exists`));

    console.log('\n✅ Migration complete!\n');
    process.exit(0);
}

run().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
