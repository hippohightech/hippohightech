export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  paid_by: number;
  category: string;
  date: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  user_id: number;
  share_amount: number;
}

export interface Group {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
}

export interface ExpenseWithDetails extends Expense {
  paid_by_username: string;
  splits: Array<{
    user_id: number;
    username: string;
    share_amount: number;
  }>;
}

export interface Settlement {
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  to_username: string;
  amount: number;
}
