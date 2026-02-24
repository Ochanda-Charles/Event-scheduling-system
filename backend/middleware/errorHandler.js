/**
 * MIDDLEWARE: Global Error Handler
 * --------------------------------
 * 
 * PROBLEM:
 * If any route or middleware throws an unhandled error,
 * Express needs a central place to catch it and send a clean response.
 * Without this, the server might crash or leak stack traces.
 * 
 * SOLUTION:
 * Express recognizes a function with 4 params (err, req, res, next)
 * as an error handler. We place it AFTER all routes.
 * 
 * HOW IT WORKS:
 * 1. Any time next(err) is called, or an async route throws,
 *    Express skips to this handler.
 * 2. We log the full error (for devs) but send a clean message (for users).
 * 3. In production, we hide the stack trace.
 */

const errorHandler = (err, req, res, next) => {
    // Log the full error for debugging
    console.error('💥 Unhandled Error:');
    console.error('  Path:', req.method, req.originalUrl);
    console.error('  Message:', err.message);

    if (process.env.NODE_ENV !== 'production') {
        console.error('  Stack:', err.stack);
    }

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Build response
    const response = {
        error: err.message || 'Internal Server Error'
    };

    // In development, include the stack trace
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
