/**
 * CONFIG: EMAILS
 * --------------
 * 
 * SUPPORTED PROVIDERS:
 * --------------------
 * 1. 'mock'   → Logs emails to the console. No setup needed. (default)
 * 2. 'gmail'  → Sends real emails via your Gmail account.
 *               Requires a Gmail App Password (NOT your normal password).
 *               How to get one: Google Account → Security → 2-Step Verification
 *               → App Passwords → Generate one for "Mail".
 * 3. 'smtp'   → Generic SMTP. Works with Outlook, Yahoo, Zoho, etc.
 *               Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.
 * 
 * SET IN .env:
 * ------------
 *   EMAIL_PROVIDER=gmail
 *   EMAIL_FROM=you@gmail.com
 *   GMAIL_USER=you@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (16-char App Password)
 */

module.exports = {
    provider: process.env.EMAIL_PROVIDER || 'mock',
    fromAddress: process.env.EMAIL_FROM || 'noreply@scheduling-app.com',

    // Gmail settings
    gmailUser: process.env.GMAIL_USER,
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD,

    // Generic SMTP settings (Outlook, Yahoo, Zoho, custom server, etc.)
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE === 'true', // true for port 465

    // Behaviour settings
    retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 3,
};
