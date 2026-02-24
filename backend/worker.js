require('dotenv').config();
const emailQueue = require('./workers/emailQueue');
const emailService = require('./services/emailService');

/**
 * BACKGROUND WORKER ENTRY POINT
 * -----------------------------
 * Run this separately from the server:   node worker.js
 * 
 * It listens to the email queue in Redis and processes jobs one by one.
 * It does NOT handle any HTTP requests — that is server.js's job.
 * 
 * FLOW:
 *   1. bookings.js → emailQueue.add({ email, type, data })     (fire & forget)
 *   2. This worker picks the job from Redis
 *   3. Calls emailService.send(email, type, data)
 *   4. Nodemailer delivers the email via Gmail/SMTP (or logs it in mock mode)
 */

console.log('\n👷 Background Worker Started...');

// Verify the email transport is configured correctly on startup
emailService.verifyConnection();

console.log('   Listening for jobs in the queue...\n');

// ============================================
// JOB PROCESSOR
// ============================================

emailQueue.process(async (job) => {
    const { email, type, data } = job.data;

    console.log(`  [Job #${job.id}] Processing: ${type} → ${email}`);

    const result = await emailService.send(email, type, data);

    console.log(`  [Job #${job.id}] ✅ Done (provider: ${result.provider}, id: ${result.messageId})`);
    return result;
});


// ============================================
// EVENT LISTENERS
// ============================================

emailQueue.on('completed', (job) => {
    console.log(`  [Job #${job.id}] ✅ Completed`);
});

emailQueue.on('failed', (job, err) => {
    console.error(`  [Job #${job.id}] ❌ Failed (attempt ${job.attemptsMade}): ${err.message}`);
    // Bull will auto-retry based on queue settings
});

emailQueue.on('error', (err) => {
    console.error('  ❌ Queue Error:', err.message);
});

// Keep the process alive indefinitely
