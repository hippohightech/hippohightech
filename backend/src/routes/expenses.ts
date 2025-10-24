import { Router, Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Expense, ExpenseSplit, ExpenseWithDetails, Settlement } from '../types';

const router = Router();

// Get all expenses for current user
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT DISTINCT e.*, u.username as paid_by_username
    FROM expenses e
    JOIN users u ON e.paid_by = u.id
    LEFT JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.paid_by = ? OR es.user_id = ?
    ORDER BY e.date DESC, e.created_at DESC
  `;

  db.all(query, [req.userId, req.userId], (err, expenses: Expense[]) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching expenses' });
    }

    // Fetch splits for each expense
    const expenseIds = expenses.map(e => e.id);
    if (expenseIds.length === 0) {
      return res.json([]);
    }

    const placeholders = expenseIds.map(() => '?').join(',');
    db.all(
      `SELECT es.*, u.username
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id IN (${placeholders})`,
      expenseIds,
      (err, splits: any[]) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching expense splits' });
        }

        const expensesWithDetails: ExpenseWithDetails[] = expenses.map((expense: any) => ({
          ...expense,
          splits: splits
            .filter(s => s.expense_id === expense.id)
            .map(s => ({
              user_id: s.user_id,
              username: s.username,
              share_amount: s.share_amount,
            })),
        }));

        res.json(expensesWithDetails);
      }
    );
  });
});

// Create new expense
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { description, amount, category, date, splits } = req.body;

  if (!description || !amount || !date || !splits || splits.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate that splits sum to total amount
  const totalSplits = splits.reduce((sum: number, split: any) => sum + split.share_amount, 0);
  if (Math.abs(totalSplits - amount) > 0.01) {
    return res.status(400).json({ error: 'Split amounts must sum to total amount' });
  }

  db.run(
    'INSERT INTO expenses (description, amount, paid_by, category, date) VALUES (?, ?, ?, ?, ?)',
    [description, amount, req.userId, category || 'Other', date],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Error creating expense' });
      }

      const expenseId = this.lastID;

      // Insert splits
      const stmt = db.prepare('INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)');

      for (const split of splits) {
        stmt.run([expenseId, split.user_id, split.share_amount], (err) => {
          if (err) {
            console.error('Error inserting split:', err);
          }
        });
      }

      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: 'Error creating expense splits' });
        }

        res.status(201).json({
          message: 'Expense created successfully',
          expenseId,
        });
      });
    }
  );
});

// Update expense
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { description, amount, category, date, splits } = req.body;

  // First check if user owns this expense
  db.get('SELECT * FROM expenses WHERE id = ? AND paid_by = ?', [id, req.userId], (err, expense) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking expense' });
    }
    if (!expense) {
      return res.status(403).json({ error: 'Not authorized to update this expense' });
    }

    // Validate splits if provided
    if (splits && splits.length > 0) {
      const totalSplits = splits.reduce((sum: number, split: any) => sum + split.share_amount, 0);
      if (Math.abs(totalSplits - amount) > 0.01) {
        return res.status(400).json({ error: 'Split amounts must sum to total amount' });
      }
    }

    db.run(
      'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ?',
      [description, amount, category || 'Other', date, id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating expense' });
        }

        if (splits && splits.length > 0) {
          // Delete old splits and insert new ones
          db.run('DELETE FROM expense_splits WHERE expense_id = ?', [id], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error updating splits' });
            }

            const stmt = db.prepare('INSERT INTO expense_splits (expense_id, user_id, share_amount) VALUES (?, ?, ?)');
            for (const split of splits) {
              stmt.run([id, split.user_id, split.share_amount]);
            }
            stmt.finalize();
          });
        }

        res.json({ message: 'Expense updated successfully' });
      }
    );
  });
});

// Delete expense
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  db.get('SELECT * FROM expenses WHERE id = ? AND paid_by = ?', [id, req.userId], (err, expense) => {
    if (err) {
      return res.status(500).json({ error: 'Error checking expense' });
    }
    if (!expense) {
      return res.status(403).json({ error: 'Not authorized to delete this expense' });
    }

    db.run('DELETE FROM expenses WHERE id = ?', [id], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error deleting expense' });
      }
      res.json({ message: 'Expense deleted successfully' });
    });
  });
});

// Calculate settlements (who owes whom)
router.get('/settlements', authenticateToken, (req: AuthRequest, res: Response) => {
  const query = `
    SELECT DISTINCT e.*, u.username as paid_by_username
    FROM expenses e
    JOIN users u ON e.paid_by = u.id
    LEFT JOIN expense_splits es ON e.id = es.expense_id
    WHERE e.paid_by = ? OR es.user_id = ?
  `;

  db.all(query, [req.userId, req.userId], (err, expenses: Expense[]) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching expenses' });
    }

    const expenseIds = expenses.map(e => e.id);
    if (expenseIds.length === 0) {
      return res.json([]);
    }

    const placeholders = expenseIds.map(() => '?').join(',');
    db.all(
      `SELECT es.*, u.username
       FROM expense_splits es
       JOIN users u ON es.user_id = u.id
       WHERE es.expense_id IN (${placeholders})`,
      expenseIds,
      (err, splits: any[]) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching splits' });
        }

        // Calculate balances: positive = owed to user, negative = user owes
        const balances: { [key: number]: { amount: number; username: string } } = {};

        expenses.forEach((expense: any) => {
          const expenseSplits = splits.filter(s => s.expense_id === expense.id);

          // Initialize payer
          if (!balances[expense.paid_by]) {
            balances[expense.paid_by] = { amount: 0, username: expense.paid_by_username };
          }

          // Payer paid the full amount
          balances[expense.paid_by].amount += expense.amount;

          // Subtract each person's share
          expenseSplits.forEach(split => {
            if (!balances[split.user_id]) {
              balances[split.user_id] = { amount: 0, username: split.username };
            }
            balances[split.user_id].amount -= split.share_amount;
          });
        });

        // Simplify settlements
        const settlements: Settlement[] = [];
        const userIds = Object.keys(balances).map(Number);

        for (let i = 0; i < userIds.length; i++) {
          for (let j = i + 1; j < userIds.length; j++) {
            const userId1 = userIds[i];
            const userId2 = userIds[j];
            const balance1 = balances[userId1].amount;
            const balance2 = balances[userId2].amount;

            if (balance1 > 0 && balance2 < 0) {
              const amount = Math.min(balance1, -balance2);
              settlements.push({
                from_user_id: userId2,
                from_username: balances[userId2].username,
                to_user_id: userId1,
                to_username: balances[userId1].username,
                amount: parseFloat(amount.toFixed(2)),
              });
              balances[userId1].amount -= amount;
              balances[userId2].amount += amount;
            } else if (balance2 > 0 && balance1 < 0) {
              const amount = Math.min(balance2, -balance1);
              settlements.push({
                from_user_id: userId1,
                from_username: balances[userId1].username,
                to_user_id: userId2,
                to_username: balances[userId2].username,
                amount: parseFloat(amount.toFixed(2)),
              });
              balances[userId2].amount -= amount;
              balances[userId1].amount += amount;
            }
          }
        }

        res.json({
          balances: Object.entries(balances).map(([userId, data]) => ({
            user_id: parseInt(userId),
            username: data.username,
            balance: parseFloat(data.amount.toFixed(2)),
          })),
          settlements,
        });
      }
    );
  });
});

export default router;
