/**
 * ROUTES: BOOKINGS
 * ----------------
 * 
 * PROBLEM:
 * Users need to schedule events/bookings.
 * 
 * RESPONSIBILITY:
 * - POST /bookings (Create)
 * - GET /bookings (List mine)
 * - GET /bookings/:id (View one)
 * - PATCH /bookings/:id (Update)
 * - DELETE /bookings/:id (Cancel)
 * 
 * INTERACTION:
 * - Validates available slots and date sanity
 * - Saves to DB
 * - Triggers "Confirmation Email" (via Worker)
 * - Creates notification on booking events
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const BookingModel = require('../models/bookingModel');
const NotificationModel = require('../models/notificationModel');
const emailQueue = require('../workers/emailQueue');
const emailService = require('../services/emailService');

// POST /api/v1/bookings
// Create a new Booking
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, start, end } = req.body;

        // 1. Basic validation
        if (!title || !start || !end) {
            return res.status(400).json({ error: 'Title, start, and end are required' });
        }

        // 2. Date validation — no booking in the past
        const startDate = new Date(start);
        const endDate = new Date(end);
        const now = new Date();

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        if (startDate < now) {
            return res.status(400).json({ error: 'Start time cannot be in the past' });
        }

        if (endDate <= startDate) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        // 3. Save to DB (Fast)
        const booking = await BookingModel.create(req.user.id, title, start, end);

        // 4. Dispatch Background Email Job (Fire and Forget)
        // emailQueue goes to Redis; the worker.js process picks it up and calls emailService.send()
        emailQueue.add({
            email: req.user.email,
            type: 'BOOKING_CONFIRMATION',
            data: {
                bookingId: booking.id,
                title: booking.title,
                start: booking.start_time,
                end: booking.end_time
            }
        });

        // 5. Create a notification for the user
        await NotificationModel.create(
            req.user.id,
            'BOOKING_CONFIRMED',
            `Booking "${title}" confirmed`,
            `Your booking is scheduled from ${startDate.toLocaleString()} to ${endDate.toLocaleString()}.`,
            { booking_id: booking.id }
        );

        // 6. Respond immediately
        res.status(201).json({
            message: 'Booking created successfully',
            booking
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/bookings
// List my bookings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookings = await BookingModel.findAllByUser(req.user.id);
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/bookings/:id
// View a single booking
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const booking = await BookingModel.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Users can only view their own bookings
        if (booking.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: Not your booking' });
        }

        res.json(booking);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/bookings/:id
// Update a booking (title, start, end)
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { title, start, end } = req.body;

        if (!title && !start && !end) {
            return res.status(400).json({ error: 'Provide at least one field to update' });
        }

        // Validate dates if provided
        if (start) {
            const startDate = new Date(start);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ error: 'Invalid start date format' });
            }
            if (startDate < new Date()) {
                return res.status(400).json({ error: 'Start time cannot be in the past' });
            }
        }

        if (end && start) {
            if (new Date(end) <= new Date(start)) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }
        }

        const updated = await BookingModel.update(req.params.id, req.user.id, { title, start, end });

        if (!updated) {
            return res.status(404).json({ error: 'Booking not found or not yours' });
        }

        res.json({
            message: 'Booking updated successfully',
            booking: updated
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/v1/bookings/:id
// Cancel a booking (soft-delete: sets status to 'cancelled')
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const cancelled = await BookingModel.cancel(req.params.id, req.user.id);

        if (!cancelled) {
            return res.status(404).json({ error: 'Booking not found, not yours, or already cancelled' });
        }

        // Send cancellation email (via queue → worker → emailService)
        emailQueue.add({
            email: req.user.email,
            type: 'BOOKING_CANCELLED',
            data: {
                bookingId: cancelled.id,
                title: cancelled.title
            }
        });

        // Create cancellation notification
        await NotificationModel.create(
            req.user.id,
            'BOOKING_CANCELLED',
            `Booking "${cancelled.title}" cancelled`,
            'Your booking has been successfully cancelled.',
            { booking_id: cancelled.id }
        );

        res.json({
            message: 'Booking cancelled successfully',
            booking: cancelled
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
