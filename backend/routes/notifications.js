/**
 * ROUTES: NOTIFICATIONS
 * ---------------------
 * 
 * PROBLEM:
 * Users need to know about bookings, org invites, and system alerts.
 * 
 * RESPONSIBILITY:
 * - GET /notifications (List all my notifications)
 * - GET /notifications/unread (List only unread)
 * - GET /notifications/count (Get unread count — for badge)
 * - PATCH /notifications/:id/read (Mark one as read)
 * - PATCH /notifications/read-all (Mark all as read)
 * - DELETE /notifications/:id (Delete a notification)
 * 
 * INTERACTION:
 * - All routes are protected (user-scoped)
 * - Notifications are created by OTHER routes (bookings, orgs)
 *   and by the background worker (email confirmations)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const NotificationModel = require('../models/notificationModel');

// GET /api/v1/notifications
// List all my notifications (unread first)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const notifications = await NotificationModel.findAllByUser(req.user.id, limit);
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/notifications/unread
// List only unread notifications
router.get('/unread', authMiddleware, async (req, res) => {
    try {
        const notifications = await NotificationModel.findUnreadByUser(req.user.id);
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/notifications/count
// Get unread count (useful for badge UI)
router.get('/count', authMiddleware, async (req, res) => {
    try {
        const count = await NotificationModel.getUnreadCount(req.user.id);
        res.json({ unread: count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/notifications/read-all
// Mark ALL notifications as read
// NOTE: This route MUST come before /:id/read to avoid route conflicts
router.patch('/read-all', authMiddleware, async (req, res) => {
    try {
        const updatedCount = await NotificationModel.markAllAsRead(req.user.id);
        res.json({
            message: 'All notifications marked as read',
            updated: updatedCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/notifications/:id/read
// Mark a single notification as read
router.patch('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await NotificationModel.markAsRead(req.params.id, req.user.id);

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({
            message: 'Notification marked as read',
            notification
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/v1/notifications/:id
// Delete a notification
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await NotificationModel.deleteById(req.params.id, req.user.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
