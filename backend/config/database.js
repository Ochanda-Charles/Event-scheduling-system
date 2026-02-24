/**
 * CONFIG: DATABASE
 * ----------------
 * 
 * We use a "Connection Pool".
 * 
 * ANALOGY:
 * Opening a connection is like shaking hands. It takes time (TCP handshake, SSL, password check).
 * If we handshake for EVERY request, the server will be slow.
 * 
 * A "Pool" keeps 10 connections open permanently.
 * When a request comes in, it borrows a connection, runs SQL, and gives it back.
 */

const { Pool } = require('pg');

// The Pool reads DATABASE_URL from process.env automatically if present,
// but we pass it explicitly to be safe and clear.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for some cloud providers (Neon/Heroku)
    }
});

// Event listener for errors (e.g., DB goes down)
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
