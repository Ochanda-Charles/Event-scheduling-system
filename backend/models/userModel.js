const db = require('../config/database');

/**
 * MODEL: User
 * -----------
 * Handles all interactions with the 'users' table.
 */
class UserModel {

    // Find a user by their email address
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(query, [email]);
        return rows[0]; // Returns undefined if not found
    }

    // Create a new user
    static async create(name, email, passwordHash) {
        const query = `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, role, created_at
    `;
        const { rows } = await db.query(query, [name, email, passwordHash]);
        return rows[0];
    }

    // Find user by ID (useful for "Get My Profile")
    static async findById(id) {
        const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    // Update user profile (name and/or email)
    static async update(id, fields) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (fields.name !== undefined) {
            setClauses.push(`name = $${paramIndex++}`);
            values.push(fields.name);
        }
        if (fields.email !== undefined) {
            setClauses.push(`email = $${paramIndex++}`);
            values.push(fields.email);
        }

        if (setClauses.length === 0) {
            return null; // Nothing to update
        }

        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, created_at
    `;
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    // Update user's password
    static async updatePassword(id, newPasswordHash) {
        const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id
    `;
        const { rows } = await db.query(query, [newPasswordHash, id]);
        return rows[0];
    }

    // Find all users (Admin — excludes password_hash)
    static async findAll() {
        const query = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';
        const { rows } = await db.query(query);
        return rows;
    }
}

module.exports = UserModel;
