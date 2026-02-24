/**
 * ROUTES: AUTHENTICATION
 * ----------------------
 * 
 * PROBLEM:
 * Users need to prove who they are (Login) and create accounts (Register).
 * 
 * RESPONSIBILITY:
 * - Handle POST /auth/register
 * - Handle POST /auth/login
 * - Handle POST /auth/logout
 * - Handle GET /auth/verify (verify token is still valid)
 * 
 * INTERACTION:
 * 1. Receives email/password
 * 2. Calls AuthService to hash/validate
 * 3. Returns a Token (JWT) if successful
 * 
 * NOTE ON LOGOUT:
 * JWTs are stateless — the server doesn't store sessions.
 * Logout is primarily a frontend concern (delete the token).
 * The endpoint below exists so the frontend has a clear API to call,
 * and we can log the event for analytics.
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');
const emailQueue = require('../workers/emailQueue');

// Helper to generate Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Simple email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // 2. Check overlap
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // 3. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 4. Create User
        const newUser = await UserModel.create(name, email, passwordHash);

        // 5. Generate Token
        const token = generateToken(newUser);

        // 6. Queue a welcome email (fire and forget)
        emailQueue.add({
            email: newUser.email,
            type: 'WELCOME',
            data: { name: newUser.name }
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // 1. Find User
        const user = await UserModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 2. Check Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate Token
        const token = generateToken(user);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/v1/auth/logout
// Stateless logout — mainly for analytics logging and frontend clarity
router.post('/logout', authMiddleware, (req, res) => {
    // In a stateless JWT system, the server doesn't "invalidate" the token.
    // The frontend simply deletes the token from storage.
    // This endpoint exists for:
    //   1. Frontend to have a clear API contract
    //   2. Logging the logout event (analytics)
    //   3. Future: token blacklisting with Redis

    console.log(`[Auth] User ${req.user.email} logged out`);

    res.json({ message: 'Logged out successfully' });
});

// GET /api/v1/auth/verify
// Verify that the current token is still valid
router.get('/verify', authMiddleware, async (req, res) => {
    try {
        // If authMiddleware passes, the token is valid
        const user = await UserModel.findById(req.user.id);

        if (!user) {
            return res.status(401).json({ error: 'User no longer exists' });
        }

        res.json({
            valid: true,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
