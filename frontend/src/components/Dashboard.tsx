import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { expenses as expensesApi } from '../api';
import { Expense, Settlement, Balance } from '../types';
import ExpenseForm from './ExpenseForm';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesRes, settlementsRes] = await Promise.all([
        expensesApi.getAll(),
        expensesApi.getSettlements(),
      ]);
      setExpenses(expensesRes.data);
      setSettlements(settlementsRes.data.settlements);
      setBalances(settlementsRes.data.balances);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await expensesApi.delete(id);
      loadData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleCloseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const handleFormSuccess = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="app">
        <nav className="navbar">
          <h1>Shared Budget App</h1>
        </nav>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <h1>Shared Budget App</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {user?.username}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        <button
          className="btn"
          onClick={() => setShowExpenseForm(true)}
          style={{ maxWidth: '200px', marginBottom: '1rem' }}
        >
          + Add Expense
        </button>

        <div className="dashboard">
          <div className="card">
            <h2>Recent Expenses</h2>
            {expenses.length === 0 ? (
              <div className="empty-state">No expenses yet. Add your first expense!</div>
            ) : (
              <ul className="expense-list">
                {expenses.map((expense) => (
                  <li key={expense.id} className="expense-item">
                    <div className="expense-info">
                      <h4>{expense.description}</h4>
                      <p>
                        Paid by: {expense.paid_by_username} | Category: {expense.category}
                      </p>
                      <p>Date: {new Date(expense.date).toLocaleDateString()}</p>
                      <p>
                        Split among: {expense.splits.map((s) => s.username).join(', ')}
                      </p>
                      {expense.paid_by === user?.id && (
                        <div className="expense-actions">
                          <button
                            className="btn-small btn-edit"
                            onClick={() => handleEdit(expense)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-delete"
                            onClick={() => handleDelete(expense.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="expense-amount">${expense.amount.toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2>Your Balance</h2>
              {balances.length === 0 ? (
                <div className="empty-state">No balances to show</div>
              ) : (
                <div>
                  {balances.map((balance) => (
                    <div key={balance.user_id} className="balance-item">
                      <span>{balance.username}</span>
                      <span
                        className={`balance-amount ${balance.balance >= 0 ? 'positive' : 'negative'}`}
                      >
                        ${Math.abs(balance.balance).toFixed(2)}{' '}
                        {balance.balance >= 0 ? 'owed to you' : 'you owe'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2>Settlements</h2>
              {settlements.length === 0 ? (
                <div className="empty-state">All settled up!</div>
              ) : (
                <ul className="settlement-list">
                  {settlements.map((settlement, index) => (
                    <li
                      key={index}
                      className={`settlement-item ${settlement.to_user_id === user?.id ? 'positive' : ''}`}
                    >
                      <strong>{settlement.from_username}</strong> owes{' '}
                      <strong>{settlement.to_username}</strong>{' '}
                      <strong style={{ color: '#e74c3c' }}>
                        ${settlement.amount.toFixed(2)}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExpenseForm && (
        <ExpenseForm
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
          expense={editingExpense}
        />
      )}
    </div>
  );
};

export default Dashboard;
