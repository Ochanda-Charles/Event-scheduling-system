const db = require('../config/database');

class OrganizationModel {
    static async create(name, ownerId) {
        const query = `
      INSERT INTO organizations (name, owner_id)
      VALUES ($1, $2)
      RETURNING *
    `;
        const { rows } = await db.query(query, [name, ownerId]);
        return rows[0];
    }

    static async findById(id) {
        const query = 'SELECT * FROM organizations WHERE id = $1';
        const { rows } = await db.query(query, [id]);
        return rows[0];
    }

    // List all organizations (optionally for a specific owner)
    static async findByOwner(ownerId) {
        const query = 'SELECT * FROM organizations WHERE owner_id = $1 ORDER BY created_at DESC';
        const { rows } = await db.query(query, [ownerId]);
        return rows;
    }

    // Update organization name
    static async update(id, ownerId, name) {
        const query = `
      UPDATE organizations
      SET name = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND owner_id = $3
      RETURNING *
    `;
        const { rows } = await db.query(query, [name, id, ownerId]);
        return rows[0];
    }

    // Delete an organization (only the owner can)
    static async delete(id, ownerId) {
        const query = `
      DELETE FROM organizations
      WHERE id = $1 AND owner_id = $2
      RETURNING id
    `;
        const { rows } = await db.query(query, [id, ownerId]);
        return rows[0];
    }

    // ========================
    // MEMBER MANAGEMENT
    // ========================

    // Add a member to an organization
    static async addMember(orgId, userId, role = 'member') {
        const query = `
      INSERT INTO organization_members (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (organization_id, user_id) DO NOTHING
      RETURNING *
    `;
        const { rows } = await db.query(query, [orgId, userId, role]);
        return rows[0]; // undefined if already a member
    }

    // Remove a member from an organization
    static async removeMember(orgId, userId) {
        const query = `
      DELETE FROM organization_members
      WHERE organization_id = $1 AND user_id = $2
      RETURNING id
    `;
        const { rows } = await db.query(query, [orgId, userId]);
        return rows[0];
    }

    // Get all members of an organization (with user info)
    static async getMembers(orgId) {
        const query = `
      SELECT om.id AS membership_id, om.role, om.joined_at,
             u.id AS user_id, u.name, u.email
      FROM organization_members om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY om.joined_at ASC
    `;
        const { rows } = await db.query(query, [orgId]);
        return rows;
    }
}

module.exports = OrganizationModel;
