import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { User } from '../types';
import { generateToken, createSlug, calculateTrialEndDate } from '../utils/helpers';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest, registerSchema, loginSchema, passwordResetSchema, resetPasswordSchema } from '../utils/validators';
import { logActivity } from '../utils/logger';

const router = Router();

// Register new user
router.post('/register', validateRequest(registerSchema), async (req: Request, res: Response) => {
  const { username, email, password, first_name, last_name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationToken = generateToken();

    db.run(
      `INSERT INTO users (username, email, password, first_name, last_name, email_verification_token)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hashedPassword, first_name || null, last_name || null, emailVerificationToken],
      async function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const userId = this.lastID;

        // Create default organization for user
        const orgName = `${username}'s Workspace`;
        const slug = `${createSlug(username)}-${Date.now()}`;
        const trialEndsAt = calculateTrialEndDate();

        db.run(
          `INSERT INTO organizations (name, slug, owner_id, subscription_plan, trial_ends_at)
           VALUES (?, ?, ?, 'free', ?)`,
          [orgName, slug, userId, trialEndsAt.toISOString()],
          function (err) {
            if (err) {
              console.error('Error creating default organization:', err);
            } else {
              const orgId = this.lastID;
              // Add user as owner
              db.run(
                'INSERT INTO organization_members (organization_id, user_id, role) VALUES (?, ?, ?)',
                [orgId, userId, 'owner'],
                (err) => {
                  if (err) console.error('Error adding organization member:', err);
                }
              );
            }
          }
        );

        // Send verification email
        try {
          await sendVerificationEmail(email, emailVerificationToken, username);
        } catch (emailError) {
          console.error('Error sending verification email:', emailError);
        }

        const token = jwt.sign(
          { userId },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );

        logActivity('user_registered', userId, undefined, 'user', userId, { username, email }, req.ip);

        res.status(201).json({
          message: 'User created successfully. Please check your email to verify your account.',
          user: { id: userId, username, email, is_email_verified: false },
          token,
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.get('/verify-email/:token', (req: Request, res: Response) => {
  const { token } = req.params;

  db.get(
    'SELECT * FROM users WHERE email_verification_token = ? AND is_email_verified = 0',
    [token],
    async (err, user: User) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      db.run(
        'UPDATE users SET is_email_verified = 1, email_verification_token = NULL WHERE id = ?',
        [user.id],
        async (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error verifying email' });
          }

          try {
            await sendWelcomeEmail(user.email, user.username);
          } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
          }

          logActivity('email_verified', user.id, undefined, 'user', user.id, {}, req.ip);

          res.json({ message: 'Email verified successfully' });
        }
      );
    }
  );
});

// Resend verification email
router.post('/resend-verification', authenticateToken, (req: AuthRequest, res: Response) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.userId], async (err, user: User) => {
    if (err || !user) {
      return res.status(500).json({ error: 'User not found' });
    }

    if (user.is_email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    const emailVerificationToken = generateToken();

    db.run(
      'UPDATE users SET email_verification_token = ? WHERE id = ?',
      [emailVerificationToken, user.id],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating token' });
        }

        try {
          await sendVerificationEmail(user.email, emailVerificationToken, user.username);
          res.json({ message: 'Verification email sent' });
        } catch (emailError) {
          console.error('Error sending verification email:', emailError);
          res.status(500).json({ error: 'Error sending email' });
        }
      }
    );
  });
});

// Login
router.post('/login', validateRequest(loginSchema), (req: Request, res: Response) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user: User) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    logActivity('user_logged_in', user.id, undefined, 'user', user.id, {}, req.ip);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        is_email_verified: user.is_email_verified,
      },
      token,
    });
  });
});

// Request password reset
router.post('/forgot-password', validateRequest(passwordResetSchema), async (req: Request, res: Response) => {
  const { email } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user: User) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists, a password reset email has been sent' });
    }

    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    db.run(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [resetToken, resetExpires.toISOString(), user.id],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error creating reset token' });
        }

        try {
          await sendPasswordResetEmail(user.email, resetToken, user.username);
          logActivity('password_reset_requested', user.id, undefined, 'user', user.id, {}, req.ip);
          res.json({ message: 'If an account exists, a password reset email has been sent' });
        } catch (emailError) {
          console.error('Error sending reset email:', emailError);
          res.status(500).json({ error: 'Error sending email' });
        }
      }
    );
  });
});

// Reset password
router.post('/reset-password', validateRequest(resetPasswordSchema), async (req: Request, res: Response) => {
  const { token, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > datetime("now")',
    [token],
    async (err, user: User) => {
      if (err) {
        return res.status(500).json({ error: 'Server error' });
      }

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
        [hashedPassword, user.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Error resetting password' });
          }

          logActivity('password_reset', user.id, undefined, 'user', user.id, {}, req.ip);

          res.json({ message: 'Password reset successfully' });
        }
      );
    }
  );
});

// Logout (client-side token removal, but we can log the activity)
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  logActivity('user_logged_out', req.userId, undefined, 'user', req.userId, {}, req.ip);
  res.json({ message: 'Logged out successfully' });
});

export default router;
