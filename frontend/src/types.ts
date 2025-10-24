export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  paid_by: number;
  paid_by_username: string;
  category: string;
  date: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface ExpenseSplit {
  user_id: number;
  username: string;
  share_amount: number;
}

export interface Settlement {
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  to_username: string;
  amount: number;
}

export interface Balance {
  user_id: number;
  username: string;
  balance: number;
}
