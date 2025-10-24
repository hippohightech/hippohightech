import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { users, expenses } from '../api';
import { User, Expense } from '../types';

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
  expense?: Expense | null;
}

interface Split {
  user_id: number;
  share_amount: number;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSuccess, expense }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDate(expense.date);
      setSplits(
        expense.splits.map((s) => ({ user_id: s.user_id, share_amount: s.share_amount }))
      );
    }
  }, [expense]);

  const loadUsers = async () => {
    try {
      const res = await users.getAll();
      setAvailableUsers(res.data);
      if (!expense && user) {
        // Default to splitting evenly between current user and one other
        setSplits([{ user_id: user.id, share_amount: 0 }]);
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const addSplit = () => {
    setSplits([...splits, { user_id: 0, share_amount: 0 }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: 'user_id' | 'share_amount', value: any) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const splitEvenly = () => {
    if (!amount || splits.length === 0) return;
    const shareAmount = parseFloat(amount) / splits.length;
    setSplits(splits.map((s) => ({ ...s, share_amount: parseFloat(shareAmount.toFixed(2)) })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!description || !amount || splits.length === 0) {
      setError('Please fill all fields and add at least one split');
      return;
    }

    const totalAmount = parseFloat(amount);
    const totalSplits = splits.reduce((sum, s) => sum + parseFloat(s.share_amount.toString()), 0);

    if (Math.abs(totalSplits - totalAmount) > 0.01) {
      setError(`Splits must sum to total amount. Current: $${totalSplits.toFixed(2)}`);
      return;
    }

    if (splits.some((s) => s.user_id === 0)) {
      setError('Please select a user for each split');
      return;
    }

    setLoading(true);
    try {
      const data = {
        description,
        amount: totalAmount,
        category,
        date,
        splits,
      };

      if (expense) {
        await expenses.update(expense.id, data);
      } else {
        await expenses.create(data);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{expense ? 'Edit Expense' : 'Add New Expense'}</h3>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Food">Food</option>
              <option value="Transportation">Transportation</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Utilities">Utilities</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Split Between</label>
            <button
              type="button"
              className="btn-secondary"
              onClick={splitEvenly}
              style={{ marginBottom: '0.5rem', width: 'auto', padding: '0.5rem 1rem' }}
            >
              Split Evenly
            </button>
            {splits.map((split, index) => (
              <div key={index} className="split-item">
                <select
                  value={split.user_id}
                  onChange={(e) => updateSplit(index, 'user_id', parseInt(e.target.value))}
                  required
                >
                  <option value={0}>Select user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={split.share_amount || ''}
                  onChange={(e) =>
                    updateSplit(index, 'share_amount', parseFloat(e.target.value) || 0)
                  }
                  required
                />
                <button type="button" onClick={() => removeSplit(index)}>
                  Remove
                </button>
              </div>
            ))}
            <button type="button" className="add-split-btn" onClick={addSplit}>
              + Add Person
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Saving...' : expense ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
