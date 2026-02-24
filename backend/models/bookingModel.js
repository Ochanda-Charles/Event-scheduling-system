const db = require('../config/database');

class BookingModel {
    static async create(userId, title, startTime, endTime) {
        const query = `
      INSERT INTO bookings (user_id, title, start_time, end_time)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
        const { rows } = await db.query(query, [userId, title, startTime, endTime]);
        return rows[0];
    }

    static async findAllByUser(userId) {
        const query = 'SELECT * FROM bookings WHERE user_id = $1 ORDER BY start_time DESC';
        const { rows } = await db.query(query, [userId]);
        return rows;
    }

    // Find a single booking by ID
    static async findById(bookingId) {
        const query = 'SELECT * FROM bookings WHERE id = $1';
        const { rows } = await db.query(query, [bookingId]);
        return rows[0];
    }

    // Cancel a booking (soft-delete — keeps history for analytics)
    static async cancel(bookingId, userId) {
        const query = `
      UPDATE bookings
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 AND status != 'cancelled'
      RETURNING *
    `;
        const { rows } = await db.query(query, [bookingId, userId]);
        return rows[0]; // Returns undefined if not found or already cancelled
    }

    // Update a booking's details
    static async update(bookingId, userId, fields) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (fields.title !== undefined) {
            setClauses.push(`title = $${paramIndex++}`);
            values.push(fields.title);
        }
        if (fields.start !== undefined) {
            setClauses.push(`start_time = $${paramIndex++}`);
            values.push(fields.start);
        }
        if (fields.end !== undefined) {
            setClauses.push(`end_time = $${paramIndex++}`);
            values.push(fields.end);
        }

        if (setClauses.length === 0) {
            return null;
        }

        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(bookingId);
        values.push(userId);

        const query = `
      UPDATE bookings
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING *
    `;
        const { rows } = await db.query(query, values);
        return rows[0];
    }
}

module.exports = BookingModel;
