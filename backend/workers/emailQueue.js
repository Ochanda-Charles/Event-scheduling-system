const Queue = require('bull');
const Redis = require('ioredis');

/**
 * QUEUE: Email Queue
 * ------------------
 * We use the 'createClient' pattern here.
 * Why? Cloud Redis (Upstash/Heroku) requires TLS (SSL).
 * Bull creates 3 separate connections (Client, Subscriber, Blocking).
 * We must ensure ALL of them use the correct TLS settings.
 */

const redisConfig = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: { rejectUnauthorized: false } // Required for Upstash
};

const emailQueue = new Queue('emails', {
    createClient: function (type) {
        switch (type) {
            case 'client':
                return new Redis(process.env.REDIS_URL, redisConfig);
            case 'subscriber':
                return new Redis(process.env.REDIS_URL, redisConfig);
            case 'bclient':
                return new Redis(process.env.REDIS_URL, redisConfig);
            default:
                return new Redis(process.env.REDIS_URL, redisConfig);
        }
    }
});

module.exports = emailQueue;
