/**
 * DATABASE MIGRATION SCRIPT
 * -------------------------
 * Reads init.sql and runs it against the database.
 * Usage: node db/migrate.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function migrate() {
    console.log('🔄 Running database migration...\n');

    try {
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await db.query(sql);
        console.log('✅ All tables created successfully!\n');

        // List all tables
        const res = await db.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('📋 Tables in database:');
        res.rows.forEach(row => console.log('   - ' + row.table_name));
        console.log('');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }

    process.exit(0);
}

migrate();
