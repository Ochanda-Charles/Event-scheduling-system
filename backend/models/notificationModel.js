const db = require('../config/database');

/**
 * MODEL: Notification
 * -------------------
 * Handles all interactions with the 'notifications' table.
 * 
 * DESIGN DECISION:
 * Notifications are user-scoped. Each notification belongs to a user.
 * The 'metadata' JSONB field carries context (e.g., booking_id, org_id)
 * so the frontend can link back to the relevant resource.
 */
class NotificationModel {

    /**
     * Create a new notification for a user
     */
    static async create(userId, type, title, message = null, metadata = {}) {
        const query = `
      INSERT INTO notifications (user_id, type, title, message, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const { rows } = await db.query(query, [
            userId, type, title, message, JSON.stringify(metadata)
        ]);
        return rows[0];
    }

    /**
     * Get all notifications for a user (unread first, then by date)
     */
    static async findAllByUser(userId, limit = 50) {
        const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY is_read ASC, created_at DESC
      LIMIT $2
    `;
        const { rows } = await db.query(query, [userId, limit]);
        return rows;
    }

    /**
     * Get only unread notifications for a user
     */
    static async findUnreadByUser(userId) {
        const query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
      ORDER BY created_at DESC
    `;
        const { rows } = await db.query(query, [userId]);
        return rows;
    }

    /**
     * Get unread notification count
     */
    static async getUnreadCount(userId) {
        const query = `
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
    `;
        const { rows } = await db.query(query, [userId]);
        return rows[0].count;
    }

    /**
     * Mark a single notification as read
     */
    static async markAsRead(notificationId, userId) {
        const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
        const { rows } = await db.query(query, [notificationId, userId]);
        return rows[0];
    }

    /**
     * Mark ALL notifications as read for a user
     */
    static async markAllAsRead(userId) {
        const query = `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1 AND is_read = FALSE
      RETURNING id
    `;
        const { rows } = await db.query(query, [userId]);
        return rows.length; // Return count of updated notifications
    }

    /**
     * Delete a notification
     */
    static async deleteById(notificationId, userId) {
        const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
        const { rows } = await db.query(query, [notificationId, userId]);
        return rows[0];
    }
}

module.exports = NotificationModel;
