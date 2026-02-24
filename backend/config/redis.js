/**
 * CONFIG: REDIS (Background Workers + Caching)
 * ----------------------------------
 * 
 * PROBLEM:
 * We need a fast, temporary storage for:
 * 1. Caching (making reads faster — e.g., dashboard stats)
 * 2. Queues (storing background jobs like "Send Email")
 * 3. Session storage (optional, for token blacklisting on logout)
 * 
 * SOLUTION:
 * Redis is an in-memory database perfect for this.
 * This config file manages the connection settings.
 * 
 * CLOUD REDIS (Upstash):
 * - Uses TLS (rediss:// protocol)
 * - Requires special connection options (see emailQueue.js)
 * 
 * LOCAL REDIS:
 * - Default: redis://127.0.0.1:6379
 * - Install: https://redis.io/docs/getting-started/
 */

module.exports = {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,

    // Connection options for cloud Redis (Upstash/Heroku)
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};
