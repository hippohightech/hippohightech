import { Router, Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { User } from '../types';

const router = Router();

// Get all users (for adding to expense splits)
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  db.all(
    'SELECT id, username, email FROM users ORDER BY username',
    [],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching users' });
      }
      res.json(users);
    }
  );
});

// Get current user info
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  db.get(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [req.userId],
    (err, user: User) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching user' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Search users by username
router.get('/search', authenticateToken, (req: AuthRequest, res: Response) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  db.all(
    'SELECT id, username, email FROM users WHERE username LIKE ? ORDER BY username LIMIT 20',
    [`%${q}%`],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Error searching users' });
      }
      res.json(users);
    }
  );
});

export default router;
