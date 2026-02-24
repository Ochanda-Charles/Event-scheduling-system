/**
 * MIDDLEWARE: Role Guard
 * ----------------------
 * 
 * PROBLEM:
 * Some endpoints should only be accessed by users with specific roles
 * (e.g., 'admin' can list all users, 'member' cannot).
 * 
 * SOLUTION:
 * This is a "Higher Order Function" — a function that RETURNS a function.
 * We call it like: roleMiddleware('admin')
 * And it creates a middleware that checks req.user.role.
 * 
 * USAGE:
 *   router.get('/admin-only', authMiddleware, roleMiddleware('admin'), handler);
 *   router.get('/admin-or-manager', authMiddleware, roleMiddleware('admin', 'manager'), handler);
 * 
 * PREREQUISITE:
 * - Must be used AFTER authMiddleware (which sets req.user)
 */

const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized: Must be logged in' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Forbidden: Requires one of these roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

module.exports = roleMiddleware;
