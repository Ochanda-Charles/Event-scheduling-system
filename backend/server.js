/**
 * SERVER ENTRY POINT
 * ------------------
 * 
 * PROBLEM:
 * The app needs a "Start Button".
 * 
 * RESPONSIBILITY:
 * 1. Initialize the Express App
 * 2. Connect to Database (Phase 4)
 * 3. Mount Middleware (Security, Parsing)
 * 4. Mount Routes (Auth, Users, Booking, Organizations, Analytics, Notifications)
 * 5. Mount Error Handlers
 * 6. Start listening for traffic on a Port
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const organizationRoutes = require('./routes/organizations');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

// Import Middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// 1. GLOBAL MIDDLEWARE (The Security Guards)
// ============================================

// Helmet sets security headers (XSS protection, etc.)
app.use(helmet());

// CORS allows your frontend to talk to this backend
// In production, we would restrict this to 'your-frontend.com'
app.use(cors());

// Morgan logs every request to the console
// e.g. "GET /api/v1/users 200 45ms"
app.use(morgan('dev'));

// Parse JSON bodies (e.g. POST data)
app.use(express.json());

// DEBUG MIDDLEWARE (Only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log('--- Request Debug ---');
        console.log('URL:', req.url);
        console.log('Content-Type:', req.headers['content-type']);
        console.log('Body:', req.body);
        console.log('---------------------');
        next();
    });
}


// ============================================
// 2. ROUTES (The Department Directory)
// ============================================

// Health Check (The "Ping" endpoint)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Mounting Domain Routes
// We prefix everything with /api/v1 to allow future versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);


// ============================================
// 3. ERROR HANDLING
// ============================================

// 404 Handler (If no route matches — must be after all routes)
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Global Error Handler (must be the LAST middleware — has 4 params)
app.use(errorHandler);


// ============================================
// 4. START SERVER
// ============================================

const db = require('./config/database');

app.listen(PORT, async () => {
    console.log(`
  🚀 Server running on http://localhost:${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  `);

    try {
        const res = await db.query('SELECT NOW()');
        console.log(`  ✅ Database Connected! Time: ${res.rows[0].now}`);
    } catch (err) {
        console.error('  ❌ Database Connection Failed:', err.message);
    }
});

module.exports = app;
