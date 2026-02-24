/**
 * ROUTES: ORGANIZATIONS
 * ---------------------
 * 
 * PROBLEM:
 * Users need to create and manage teams/organizations.
 * 
 * RESPONSIBILITY:
 * - POST /organizations (Create)
 * - GET /organizations (List mine — owned by me)
 * - GET /organizations/:id (View one)
 * - PATCH /organizations/:id (Update name — owner only)
 * - DELETE /organizations/:id (Delete — owner only)
 * - POST /organizations/:id/members (Add member)
 * - GET /organizations/:id/members (List members)
 * - DELETE /organizations/:id/members/:userId (Remove member)
 * 
 * INTERACTION:
 * - Protected by authMiddleware
 * - Owner-only actions enforced in model layer (WHERE owner_id = $1)
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const OrganizationModel = require('../models/organizationModel');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');

// POST /api/v1/organizations
// Create a new Organization
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        const org = await OrganizationModel.create(name, req.user.id);

        // Automatically add the owner as an 'admin' member
        await OrganizationModel.addMember(org.id, req.user.id, 'admin');

        res.status(201).json({
            message: 'Organization created successfully',
            organization: org
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/organizations
// List my organizations
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orgs = await OrganizationModel.findByOwner(req.user.id);
        res.json(orgs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/organizations/:id
// View a specific organization
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const org = await OrganizationModel.findById(req.params.id);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        // Also fetch members for a complete view
        const members = await OrganizationModel.getMembers(req.params.id);

        res.json({
            ...org,
            members
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /api/v1/organizations/:id
// Update organization name (owner only)
router.patch('/:id', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        // The model enforces owner_id check
        const updated = await OrganizationModel.update(req.params.id, req.user.id, name);

        if (!updated) {
            return res.status(404).json({ error: 'Organization not found or you are not the owner' });
        }

        res.json({
            message: 'Organization updated successfully',
            organization: updated
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/v1/organizations/:id
// Delete an organization (owner only — cascades to members)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await OrganizationModel.delete(req.params.id, req.user.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Organization not found or you are not the owner' });
        }

        res.json({ message: 'Organization deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========================
// MEMBER MANAGEMENT
// ========================

// POST /api/v1/organizations/:id/members
// Add a member by their email
router.post('/:id/members', authMiddleware, async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Member email is required' });
        }

        // Verify the requester is the org owner
        const org = await OrganizationModel.findById(req.params.id);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (org.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the organization owner can add members' });
        }

        // Find the user to add
        const userToAdd = await UserModel.findByEmail(email);
        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found with that email' });
        }

        const member = await OrganizationModel.addMember(
            req.params.id,
            userToAdd.id,
            role || 'member'
        );

        if (!member) {
            return res.status(400).json({ error: 'User is already a member' });
        }

        // Notify the new member
        await NotificationModel.create(
            userToAdd.id,
            'ORG_INVITE',
            `You've been added to "${org.name}"`,
            `You are now a ${role || 'member'} of the organization "${org.name}".`,
            { organization_id: org.id }
        );

        res.status(201).json({
            message: 'Member added successfully',
            member
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/v1/organizations/:id/members
// List all members of an organization
router.get('/:id/members', authMiddleware, async (req, res) => {
    try {
        const org = await OrganizationModel.findById(req.params.id);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const members = await OrganizationModel.getMembers(req.params.id);
        res.json(members);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/v1/organizations/:id/members/:userId
// Remove a member (owner only, can't remove yourself)
router.delete('/:id/members/:userId', authMiddleware, async (req, res) => {
    try {
        const org = await OrganizationModel.findById(req.params.id);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (org.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Only the organization owner can remove members' });
        }

        // Can't remove yourself (the owner)
        if (parseInt(req.params.userId) === req.user.id) {
            return res.status(400).json({ error: 'You cannot remove yourself from your own organization' });
        }

        const removed = await OrganizationModel.removeMember(req.params.id, req.params.userId);

        if (!removed) {
            return res.status(404).json({ error: 'Member not found in this organization' });
        }

        res.json({ message: 'Member removed successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
