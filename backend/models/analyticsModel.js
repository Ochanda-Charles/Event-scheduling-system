const db = require('../config/database');

/**
 * MODEL: Analytics
 * ----------------
 * Handles all interactions with the 'analytics_events' table.
 * 
 * DESIGN DECISION:
 * We use JSONB for 'metadata' so each event type can carry
 * different payloads without schema changes.
 * e.g., { page: '/bookings', device: 'mobile' }
 */
class AnalyticsModel {

    /**
     * Log a new analytics event
     * @param {number|null} userId - The user who triggered the event (null for anonymous)
     * @param {string} eventType - e.g., 'PAGE_VIEW', 'BOOKING_CREATED'
     * @param {object} metadata - Flexible JSON payload
     */
    static async logEvent(userId, eventType, metadata = {}) {
        const query = `
      INSERT INTO analytics_events (user_id, event_type, metadata)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
        const { rows } = await db.query(query, [userId, eventType, JSON.stringify(metadata)]);
        return rows[0];
    }

    /**
     * Get a summary of events grouped by type
     * Useful for the dashboard overview.
     * @param {number} days - How many days back to look (default 30)
     */
    static async getDashboardSummary(days = 30) {
        const query = `
      SELECT 
        event_type,
        COUNT(*)::int AS count,
        COUNT(DISTINCT user_id)::int AS unique_users,
        MIN(created_at) AS first_event,
        MAX(created_at) AS last_event
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY event_type
      ORDER BY count DESC
    `;
        const { rows } = await db.query(query, [days]);
        return rows;
    }

    /**
     * Get total event count and unique users for a quick stats overview
     */
    static async getQuickStats(days = 30) {
        const query = `
      SELECT 
        COUNT(*)::int AS total_events,
        COUNT(DISTINCT user_id)::int AS unique_users,
        COUNT(DISTINCT event_type)::int AS event_types
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
    `;
        const { rows } = await db.query(query, [days]);
        return rows[0];
    }

    /**
     * Get recent events (with optional type filter)
     */
    static async getRecentEvents(limit = 50, eventType = null) {
        let query;
        let params;

        if (eventType) {
            query = `
        SELECT ae.*, u.name AS user_name, u.email AS user_email
        FROM analytics_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        WHERE ae.event_type = $1
        ORDER BY ae.created_at DESC
        LIMIT $2
      `;
            params = [eventType, limit];
        } else {
            query = `
        SELECT ae.*, u.name AS user_name, u.email AS user_email
        FROM analytics_events ae
        LEFT JOIN users u ON ae.user_id = u.id
        ORDER BY ae.created_at DESC
        LIMIT $1
      `;
            params = [limit];
        }

        const { rows } = await db.query(query, params);
        return rows;
    }
}

module.exports = AnalyticsModel;
