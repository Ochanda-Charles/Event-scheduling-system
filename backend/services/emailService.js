/**
 * SERVICE: Email Sender
 * ---------------------
 * 
 * This module is the single place that ACTUALLY sends emails.
 * It reads EMAIL_PROVIDER from config and picks the right transport.
 * 
 * The rest of the app (worker.js, routes) never calls nodemailer directly —
 * they just call emailService.send(...) and this file handles everything.
 * 
 * This is the "Provider Pattern" — swapping Gmail for SendGrid
 * only requires touching THIS file, nothing else.
 */

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

// ============================================
// BUILD TRANSPORTER BASED ON PROVIDER
// ============================================

function createTransporter() {
    switch (emailConfig.provider) {

        case 'gmail':
            // Uses Gmail SMTP via an App Password (NOT your normal Gmail password).
            // ⚠️  You MUST have 2-Step Verification enabled to generate an App Password.
            // Guide: https://support.google.com/accounts/answer/185833
            if (!emailConfig.gmailUser || !emailConfig.gmailAppPassword) {
                throw new Error(
                    'Gmail provider requires GMAIL_USER and GMAIL_APP_PASSWORD in .env'
                );
            }
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: emailConfig.gmailUser,
                    pass: emailConfig.gmailAppPassword,   // 16-char App Password e.g. "abcd efgh ijkl mnop"
                },
            });

        case 'smtp':
            // Generic SMTP — works with Outlook, Yahoo, Zoho, any custom mail server.
            if (!emailConfig.smtpHost || !emailConfig.smtpUser || !emailConfig.smtpPassword) {
                throw new Error(
                    'SMTP provider requires SMTP_HOST, SMTP_USER, and SMTP_PASS in .env'
                );
            }
            return nodemailer.createTransport({
                host: emailConfig.smtpHost,
                port: emailConfig.smtpPort,
                secure: emailConfig.smtpSecure,  // true for port 465, false for 587
                auth: {
                    user: emailConfig.smtpUser,
                    pass: emailConfig.smtpPassword,
                },
            });

        case 'mock':
        default:
            // Nodemailer's built-in "ethereal" mock creates a fake SMTP server.
            // It still shows you the email, just doesn't deliver it to a real inbox.
            // We'll log to console for simplicity in this learning project.
            return null; // Handled separately in send()
    }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

const templates = {
    BOOKING_CONFIRMATION: (data) => ({
        subject: `✅ Booking Confirmed: "${data.title}"`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background:#2563eb; padding: 24px; color: white;">
                    <h1 style="margin:0; font-size:22px;">📅 Booking Confirmed</h1>
                </div>
                <div style="padding: 24px;">
                    <p>Hi there!</p>
                    <p>Your booking <strong>"${data.title}"</strong> has been confirmed.</p>
                    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                        <tr style="background:#f3f4f6;">
                            <td style="padding:10px; font-weight:bold;">Booking ID</td>
                            <td style="padding:10px;">#${data.bookingId}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px; font-weight:bold;">Start</td>
                            <td style="padding:10px;">${new Date(data.start).toLocaleString()}</td>
                        </tr>
                        <tr style="background:#f3f4f6;">
                            <td style="padding:10px; font-weight:bold;">End</td>
                            <td style="padding:10px;">${new Date(data.end).toLocaleString()}</td>
                        </tr>
                    </table>
                    <p style="color:#6b7280; font-size:14px;">Thank you for using our scheduling system!</p>
                </div>
            </div>
        `,
    }),

    BOOKING_CANCELLED: (data) => ({
        subject: `❌ Booking Cancelled: "${data.title}"`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background:#dc2626; padding: 24px; color: white;">
                    <h1 style="margin:0; font-size:22px;">🚫 Booking Cancelled</h1>
                </div>
                <div style="padding: 24px;">
                    <p>Hi there,</p>
                    <p>Your booking <strong>"${data.title}"</strong> (ID: #${data.bookingId}) has been cancelled.</p>
                    <p>If this was a mistake, you can create a new booking at any time.</p>
                    <p style="color:#6b7280; font-size:14px;">Scheduling App Team</p>
                </div>
            </div>
        `,
    }),

    WELCOME: (data) => ({
        subject: `👋 Welcome to Scheduling App, ${data.name}!`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background:#16a34a; padding: 24px; color: white;">
                    <h1 style="margin:0; font-size:22px;">Welcome aboard! 🎉</h1>
                </div>
                <div style="padding: 24px;">
                    <p>Hi <strong>${data.name}</strong>!</p>
                    <p>Your account has been created successfully. You can now create bookings, join organizations, and more.</p>
                    <p style="color:#6b7280; font-size:14px;">Scheduling App Team</p>
                </div>
            </div>
        `,
    }),

    ORG_INVITE: (data) => ({
        subject: `🏢 You've been added to "${data.orgName}"`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background:#7c3aed; padding: 24px; color: white;">
                    <h1 style="margin:0; font-size:22px;">🏢 Organization Invite</h1>
                </div>
                <div style="padding: 24px;">
                    <p>Hi there!</p>
                    <p>You've been added as a <strong>${data.role}</strong> to the organization <strong>"${data.orgName}"</strong>.</p>
                    <p style="color:#6b7280; font-size:14px;">Scheduling App Team</p>
                </div>
            </div>
        `,
    }),
};

// Fallback plain-text version (for email clients that don't support HTML)
function toPlainText(html) {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// ============================================
// MAIN SEND FUNCTION
// ============================================

async function send(to, type, data) {
    const templateFn = templates[type];
    if (!templateFn) {
        throw new Error(`Unknown email type: "${type}". Available: ${Object.keys(templates).join(', ')}`);
    }

    const { subject, html } = templateFn(data);

    // --- MOCK MODE ---
    if (emailConfig.provider === 'mock') {
        // Simulate a short network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('\n  📧 [MOCK EMAIL]');
        console.log(`     To      : ${to}`);
        console.log(`     Subject : ${subject}`);
        console.log(`     Type    : ${type}`);
        console.log(`     (Set EMAIL_PROVIDER=gmail in .env to send real emails)\n`);
        return { success: true, provider: 'mock', messageId: `mock-${Date.now()}` };
    }

    // --- REAL SEND (Gmail or SMTP) ---
    const transporter = createTransporter();

    const info = await transporter.sendMail({
        from: `"Scheduling App" <${emailConfig.fromAddress}>`,
        to,
        subject,
        html,
        text: toPlainText(html),  // Plain-text fallback
    });

    console.log(`  📧 Email sent to ${to} | MessageId: ${info.messageId}`);
    return { success: true, provider: emailConfig.provider, messageId: info.messageId };
}

// Verify transporter config on startup (only in non-mock mode)
async function verifyConnection() {
    if (emailConfig.provider === 'mock') {
        console.log('  📧 Email Service: MOCK mode (console only)');
        return;
    }
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log(`  ✅ Email Service: Connected via ${emailConfig.provider.toUpperCase()}`);
    } catch (err) {
        console.error(`  ❌ Email Service: Connection failed (${emailConfig.provider}): ${err.message}`);
    }
}

module.exports = { send, verifyConnection, templates };
