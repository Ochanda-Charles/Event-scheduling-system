const jwt = require('jsonwebtoken');

/**
 * MIDDLEWARE: Auth Guard
 * ----------------------
 * 
 * PROBLEM:
 * Some routes (e.g., "My Profile", "Create Booking") should only be accessed by logged-in users.
 * 
 * SOLUTION:
 * 1. Check for the 'Authorization' header.
 * 2. Extract the token (Bearer <token>).
 * 3. Verify the token using our secret.
 * 4. If valid, attach the user info to 'req.user' and let them pass (next()).
 * 5. If invalid, stop them (401 Unauthorized).
 */

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id: 1, email: '...', role: 'member' }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = authMiddleware;
