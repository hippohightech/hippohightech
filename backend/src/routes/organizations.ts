import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  checkSubscriptionLimits,
  OrgRequest,
} from '../middleware/organization';
import { Organization, OrganizationMember, Invitation, User } from '../types';
import { generateToken, generateUniqueSlug, addDays, calculateTrialEndDate } from '../utils/helpers';
import { sendInvitationEmail } from '../services/emailService';
import { logActivity } from '../utils/logger';
import { validateRequest, createOrganizationSchema, inviteMemberSchema } from '../utils/validators';

const router = Router();

// Get all organizations for current user
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT o.*, om.role, COUNT(DISTINCT om2.id) as member_count
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    LEFT JOIN organization_members om2 ON o.id = om2.organization_id
    WHERE om.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.all(query, [req.userId], (err, organizations) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching organizations' });
    }
    res.json(organizations);
  });
});

// Create new organization
router.post(
  '/',
  authenticateToken,
  validateRequest(createOrganizationSchema),
  async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;

    try {
      // Generate unique slug
      const checkSlugExists = (slug: string): Promise<boolean> => {
        return new Promise((resolve) => {
          db.get('SELECT id FROM organizations WHERE slug = ?', [slug], (err, row) => {
            resolve(!!row);
          });
        });
      };

      const slug = await generateUniqueSlug(name, checkSlugExists);
      const trialEndsAt = calculateTrialEndDate();

      db.run(
        `INSERT INTO organizations (name, slug, description, owner_id, subscription_plan, trial_ends_at)
         VALUES (?, ?, ?, ?, 'free', ?)`,
        [name, slug, description || null, req.userId, trialEndsAt.toISOString()],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Error creating organization' });
          }

          const organizationId = this.lastID;

          // Add creator as owner
          db.run(
            'INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)',
            [organizationId, req.userId, 'owner'],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Error adding member' });
              }

              logActivity(
                'organization_created',
                req.userId,
                organizationId,
                'organization',
                organizationId,
                { name, slug },
                req.ip
              );

              res.status(201).json({
                message: 'Organization created successfully',
                organization: {
                  id: organizationId,
                  name,
                  slug,
                  description,
                  subscription_plan: 'free',
                  trial_ends_at: trialEndsAt,
                },
              });
            }
          );
        }
      );
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get organization details
router.get(
  '/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  (req: OrgRequest, res: Response) => {
    const organization = req.organization;

    // Get member count and other stats
    db.get(
      `SELECT
         COUNT(DISTINCT om.id) as member_count,
         COUNT(DISTINCT e.id) as expense_count
       FROM organizations o
       LEFT JOIN organization_members om ON o.id = om.organization_id
       LEFT JOIN expenses e ON o.id = e.organization_id
       WHERE o.id = ?`,
      [organization!.id],
      (err, stats: any) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching stats' });
        }

        res.json({
          ...organization,
          role: req.userRole,
          stats,
        });
      }
    );
  }
);

// Update organization
router.put(
  '/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  (req: OrgRequest, res: Response) => {
    const { name, description } = req.body;

    db.run(
      'UPDATE organizations SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description || null, req.organization!.id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating organization' });
        }

        logActivity(
          'organization_updated',
          req.userId,
          req.organization!.id,
          'organization',
          req.organization!.id,
          { name, description },
          req.ip
        );

        res.json({ message: 'Organization updated successfully' });
      }
    );
  }
);

// Delete organization
router.delete(
  '/:organizationId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  (req: OrgRequest, res: Response) => {
    // Only owner can delete
    if (req.organization!.owner_id !== req.userId) {
      return res.status(403).json({ error: 'Only the owner can delete the organization' });
    }

    db.run('DELETE FROM organizations WHERE id = ?', [req.organization!.id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting organization' });
      }

      logActivity(
        'organization_deleted',
        req.userId,
        undefined,
        'organization',
        req.organization!.id,
        { name: req.organization!.name },
        req.ip
      );

      res.json({ message: 'Organization deleted successfully' });
    });
  }
);

// Get organization members
router.get(
  '/:organizationId/members',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  (req: OrgRequest, res: Response) => {
    db.all(
      `SELECT om.*, u.username, u.email, u.first_name, u.last_name, u.avatar_url
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = ?
       ORDER BY om.joined_at ASC`,
      [req.organization!.id],
      (err, members) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching members' });
        }
        res.json(members);
      }
    );
  }
);

// Invite member
router.post(
  '/:organizationId/invite',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  checkSubscriptionLimits,
  validateRequest(inviteMemberSchema),
  async (req: OrgRequest, res: Response) => {
    const { email, role = 'member' } = req.body;

    // Check if user is already a member
    const checkMembership = new Promise((resolve, reject) => {
      db.get(
        `SELECT om.* FROM organization_members om
         JOIN users u ON om.user_id = u.id
         WHERE om.organization_id = ? AND u.email = ?`,
        [req.organization!.id, email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    try {
      const existingMember = await checkMembership;
      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Check for existing pending invitation
      db.get(
        'SELECT * FROM invitations WHERE organization_id = ? AND email = ? AND accepted = 0',
        [req.organization!.id, email],
        (err, existingInvite: Invitation) => {
          if (existingInvite) {
            return res.status(400).json({ error: 'Invitation already sent to this email' });
          }

          const token = generateToken();
          const expiresAt = addDays(new Date(), 7);

          db.run(
            `INSERT INTO invitations (organization_id, email, role, token, invited_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.organization!.id, email, role, token, req.userId, expiresAt.toISOString()],
            async function (err) {
              if (err) {
                return res.status(500).json({ error: 'Error creating invitation' });
              }

              // Get inviter name
              db.get('SELECT username FROM users WHERE id = ?', [req.userId], async (err, inviter: User) => {
                try {
                  await sendInvitationEmail(
                    email,
                    req.organization!.name,
                    inviter?.username || 'A team member',
                    token
                  );

                  logActivity(
                    'member_invited',
                    req.userId,
                    req.organization!.id,
                    'invitation',
                    this.lastID,
                    { email, role },
                    req.ip
                  );

                  res.status(201).json({
                    message: 'Invitation sent successfully',
                    invitation: { id: this.lastID, email, role },
                  });
                } catch (emailError) {
                  console.error('Error sending invitation email:', emailError);
                  res.status(201).json({
                    message: 'Invitation created but email failed to send',
                    invitation: { id: this.lastID, email, role },
                  });
                }
              });
            }
          );
        }
      );
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Remove member
router.delete(
  '/:organizationId/members/:memberId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  (req: OrgRequest, res: Response) => {
    const { memberId } = req.params;

    // Cannot remove owner
    if (parseInt(memberId) === req.organization!.owner_id) {
      return res.status(400).json({ error: 'Cannot remove organization owner' });
    }

    db.run(
      'DELETE FROM organization_members WHERE organization_id = ? AND user_id = ?',
      [req.organization!.id, memberId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error removing member' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Member not found' });
        }

        logActivity(
          'member_removed',
          req.userId,
          req.organization!.id,
          'member',
          parseInt(memberId),
          {},
          req.ip
        );

        res.json({ message: 'Member removed successfully' });
      }
    );
  }
);

// Update member role
router.put(
  '/:organizationId/members/:memberId',
  authenticateToken,
  requireOrganization,
  requireOrganizationMember,
  requireOrganizationAdmin,
  (req: OrgRequest, res: Response) => {
    const { memberId } = req.params;
    const { role } = req.body;

    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change owner role
    if (parseInt(memberId) === req.organization!.owner_id) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    db.run(
      'UPDATE organization_members SET role = ? WHERE organization_id = ? AND user_id = ?',
      [role, req.organization!.id, memberId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating member role' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Member not found' });
        }

        logActivity(
          'member_role_updated',
          req.userId,
          req.organization!.id,
          'member',
          parseInt(memberId),
          { role },
          req.ip
        );

        res.json({ message: 'Member role updated successfully' });
      }
    );
  }
);

export default router;
