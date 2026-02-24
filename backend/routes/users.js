/**
 * ROUTES: USERS
 * -------------
 * 
 * PROBLEM:
 * We need to view and update user profiles.
 * 
 * RESPONSIBILITY:
 * - Handle GET /users/me (My profile)
 * - Handle PATCH /users/me (Update my profile)
 * - Handle PATCH /users/me/password (Change password)
 * - Handle GET /users (List all — Admin only)
 * 
 * INTERACTION:
 * - Protected by Middleware (must be logged in)
 * - Talks to User Model to fetch/update data
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/authMiddleware');
const UserModel = require('../models/userModel');

// GET /api/v1/users/me
// Get my profile (Protected)
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/users/me
// Update my profile (name and/or email)
router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const { name, email } = req.body;

        // Must provide at least one field
        if (!name && !email) {
            return res.status(400).json({ error: 'Provide at least name or email to update' });
        }

        // If changing email, make sure it's not already taken
        if (email) {
            const existing = await UserModel.findByEmail(email);
            if (existing && existing.id !== req.user.id) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const updatedUser = await UserModel.update(req.user.id, { name, email });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/users/me/password
// Change my password (requires current password)
router.patch('/me/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Fetch user WITH password hash for comparison
        const user = await UserModel.findByEmail(req.user.email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);
        await UserModel.updatePassword(req.user.id, newHash);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/users
// List all users (Admin only)
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Role check — only admins can list all users
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        const users = await UserModel.findAll();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
