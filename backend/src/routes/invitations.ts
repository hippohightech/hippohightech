import { Router, Request, Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Invitation, Organization, User } from '../types';
import { logActivity } from '../utils/logger';

const router = Router();

// Accept invitation
router.post('/accept/:token', authenticateToken, (req: AuthRequest, res: Response) => {
  const { token } = req.params;

  db.get(
    'SELECT * FROM invitations WHERE token = ? AND accepted = 0',
    [token],
    (err, invitation: Invitation) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found or already accepted' });
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Get user email to verify it matches
      db.get('SELECT email FROM users WHERE id = ?', [req.userId], (err, user: User) => {
        if (err || !user) {
          return res.status(500).json({ error: 'User not found' });
        }

        if (user.email !== invitation.email) {
          return res.status(403).json({
            error: 'This invitation was sent to a different email address',
          });
        }

        // Check if already a member
        db.get(
          'SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?',
          [invitation.organization_id, req.userId],
          (err, existing) => {
            if (existing) {
              return res.status(400).json({ error: 'You are already a member of this organization' });
            }

            // Add as member
            db.run(
              'INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)',
              [invitation.organization_id, req.userId, invitation.role],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Error adding member' });
                }

                // Mark invitation as accepted
                db.run('UPDATE invitations SET accepted = 1 WHERE id = ?', [invitation.id], (err) => {
                  if (err) {
                    console.error('Error updating invitation:', err);
                  }

                  logActivity(
                    'invitation_accepted',
                    req.userId,
                    invitation.organization_id,
                    'invitation',
                    invitation.id,
                    {},
                    req.ip
                  );

                  // Get organization details
                  db.get(
                    'SELECT * FROM organizations WHERE id = ?',
                    [invitation.organization_id],
                    (err, organization: Organization) => {
                      res.json({
                        message: 'Invitation accepted successfully',
                        organization,
                      });
                    }
                  );
                });
              }
            );
          }
        );
      });
    }
  );
});

// Get pending invitations for current user
router.get('/pending', authenticateToken, (req: AuthRequest, res: Response) => {
  db.get('SELECT email FROM users WHERE id = ?', [req.userId], (err, user: User) => {
    if (err || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    db.all(
      `SELECT i.*, o.name as organization_name, u.username as inviter_name
       FROM invitations i
       JOIN organizations o ON i.organization_id = o.id
       JOIN users u ON i.invited_by = u.id
       WHERE i.email = ? AND i.accepted = 0 AND i.expires_at > datetime('now')
       ORDER BY i.created_at DESC`,
      [user.email],
      (err, invitations) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching invitations' });
        }
        res.json(invitations);
      }
    );
  });
});

// Decline invitation
router.post('/decline/:token', authenticateToken, (req: AuthRequest, res: Response) => {
  const { token } = req.params;

  db.get('SELECT email FROM users WHERE id = ?', [req.userId], (err, user: User) => {
    if (err || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    db.run(
      'DELETE FROM invitations WHERE token = ? AND email = ? AND accepted = 0',
      [token, user.email],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error declining invitation' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Invitation not found' });
        }

        res.json({ message: 'Invitation declined' });
      }
    );
  });
});

export default router;
