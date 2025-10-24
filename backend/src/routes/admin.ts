import { Router, Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User, Organization } from '../types';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  db.get('SELECT is_admin FROM users WHERE id = ?', [req.userId], (err, user: User) => {
    if (err || !user) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// Dashboard stats
router.get('/stats', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const stats: any = {};

  // Total users
  db.get('SELECT COUNT(*) as count FROM users', [], (err, result: any) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    stats.total_users = result.count;

    // Total organizations
    db.get('SELECT COUNT(*) as count FROM organizations', [], (err, result: any) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      stats.total_organizations = result.count;

      // Total expenses
      db.get('SELECT COUNT(*) as count, SUM(amount) as total FROM expenses', [], (err, result: any) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        stats.total_expenses = result.count;
        stats.total_expense_amount = result.total || 0;

        // Active subscriptions
        db.get(
          `SELECT COUNT(*) as count FROM organizations
           WHERE subscription_plan != 'free' AND subscription_status = 'active'`,
          [],
          (err, result: any) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            stats.active_subscriptions = result.count;

            // Monthly revenue
            db.all(
              `SELECT sp.price, COUNT(*) as count
               FROM organizations o
               JOIN subscription_plans sp ON o.subscription_plan = sp.name
               WHERE o.subscription_status = 'active' AND sp.billing_period = 'monthly'
               GROUP BY sp.name`,
              [],
              (err, plans: any[]) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                stats.monthly_revenue = plans.reduce(
                  (sum, plan) => sum + plan.price * plan.count,
                  0
                );

                // Recent signups (last 30 days)
                db.get(
                  `SELECT COUNT(*) as count FROM users
                   WHERE created_at >= datetime('now', '-30 days')`,
                  [],
                  (err, result: any) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    stats.recent_signups = result.count;

                    // Subscription breakdown
                    db.all(
                      `SELECT subscription_plan, COUNT(*) as count
                       FROM organizations
                       GROUP BY subscription_plan`,
                      [],
                      (err, breakdown: any[]) => {
                        if (err) return res.status(500).json({ error: 'Database error' });
                        stats.subscription_breakdown = breakdown;

                        res.json(stats);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});

// Get all users with pagination
router.get('/users', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT id, username, email, first_name, last_name, is_admin, is_email_verified, last_login, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching users' });
      }

      db.get('SELECT COUNT(*) as total FROM users', [], (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Error counting users' });
        }

        res.json({
          users,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit),
          },
        });
      });
    }
  );
});

// Get all organizations
router.get('/organizations', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  db.all(
    `SELECT o.*, u.username as owner_name, u.email as owner_email,
            COUNT(DISTINCT om.id) as member_count,
            COUNT(DISTINCT e.id) as expense_count
     FROM organizations o
     JOIN users u ON o.owner_id = u.id
     LEFT JOIN organization_members om ON o.id = om.organization_id
     LEFT JOIN expenses e ON o.id = e.organization_id
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
    (err, organizations) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching organizations' });
      }

      db.get('SELECT COUNT(*) as total FROM organizations', [], (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Error counting organizations' });
        }

        res.json({
          organizations,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit),
          },
        });
      });
    }
  );
});

// Get recent activity
router.get('/activity', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  db.all(
    `SELECT al.*, u.username, u.email, o.name as organization_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     LEFT JOIN organizations o ON al.organization_id = o.id
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [limit],
    (err, logs) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching activity logs' });
      }
      res.json(logs);
    }
  );
});

// Toggle user admin status
router.put('/users/:userId/admin', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { is_admin } = req.body;

  if (parseInt(userId) === req.userId) {
    return res.status(400).json({ error: 'Cannot modify your own admin status' });
  }

  db.run(
    'UPDATE users SET is_admin = ? WHERE id = ?',
    [is_admin ? 1 : 0, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating user' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User admin status updated' });
    }
  );
});

// Delete user (soft delete or hard delete)
router.delete('/users/:userId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  if (parseInt(userId) === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  // Check if user owns any organizations
  db.get(
    'SELECT COUNT(*) as count FROM organizations WHERE owner_id = ?',
    [userId],
    (err, result: any) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({
          error: 'Cannot delete user who owns organizations. Transfer ownership first.',
        });
      }

      db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error deleting user' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
      });
    }
  );
});

// Update organization subscription manually
router.put(
  '/organizations/:organizationId/subscription',
  authenticateToken,
  requireAdmin,
  (req: AuthRequest, res: Response) => {
    const { organizationId } = req.params;
    const { subscription_plan, subscription_status } = req.body;

    db.run(
      'UPDATE organizations SET subscription_plan = ?, subscription_status = ? WHERE id = ?',
      [subscription_plan, subscription_status, organizationId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Error updating organization' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({ message: 'Organization subscription updated' });
      }
    );
  }
);

// Get all payments
router.get('/payments', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  db.all(
    `SELECT p.*, o.name as organization_name
     FROM payments p
     JOIN organizations o ON p.organization_id = o.id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [limit],
    (err, payments) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching payments' });
      }
      res.json(payments);
    }
  );
});

export default router;
