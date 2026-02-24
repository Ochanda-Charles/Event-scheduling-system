/**
 * ROUTES: ANALYTICS
 * -----------------
 * 
 * PROBLEM:
 * We want to track how the system is used — page views, actions, user activity.
 * 
 * RESPONSIBILITY:
 * - POST /analytics/event (Log an action)
 * - GET /analytics/dashboard (View aggregated stats)
 * - GET /analytics/events (View recent events — admin)
 * 
 * INTERACTION:
 * - Event logging is public (or lightly protected) for flexibility
 * - Dashboard is protected (admin or authenticated users)
 * - High volume! Uses async DB writes so the response is fast.
 * 
 * DESIGN NOTE:
 * Analytics events use JSONB 'metadata' for flexible payloads.
 * This means different event types can carry different data
 * without requiring schema migrations.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const AnalyticsModel = require('../models/analyticsModel');

// POST /api/v1/analytics/event
// Log an analytics event (accepts optional auth)
router.post('/event', async (req, res) => {
    try {
        const { eventType, metadata } = req.body;

        if (!eventType) {
            return res.status(400).json({ error: 'eventType is required' });
        }

        // Extract user ID from token if present (optional auth)
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
                userId = decoded.id;
            } catch {
                // Token invalid — that's OK, log as anonymous
            }
        }

        // Fire and forget — don't block the response
        const event = await AnalyticsModel.logEvent(userId, eventType, metadata || {});

        res.status(201).json({
            message: 'Event logged',
            event: { id: event.id, event_type: event.event_type }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/analytics/dashboard
// View aggregated stats (protected)
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        // Fetch both summary and quick stats in parallel
        const [summary, quickStats] = await Promise.all([
            AnalyticsModel.getDashboardSummary(days),
            AnalyticsModel.getQuickStats(days)
        ]);

        res.json({
            period: `Last ${days} days`,
            overview: quickStats,
            breakdown: summary
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/analytics/events
// View recent events with optional filter (admin)
router.get('/events', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const limit = parseInt(req.query.limit) || 50;
        const eventType = req.query.type || null;

        const events = await AnalyticsModel.getRecentEvents(limit, eventType);
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
