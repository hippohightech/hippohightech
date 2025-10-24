export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_admin: number;
  is_email_verified: number;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  owner_id: number;
  subscription_plan: string;
  subscription_status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  max_members: number;
  max_expenses: number;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: number;
  organization_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Invitation {
  id: number;
  organization_id: number;
  email: string;
  role: string;
  token: string;
  invited_by: number;
  accepted: number;
  expires_at: string;
  created_at: string;
}

export interface Expense {
  id: number;
  organization_id: number;
  description: string;
  amount: number;
  paid_by: number;
  category: string;
  date: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  user_id: number;
  share_amount: number;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  display_name: string;
  price: number;
  billing_period: string;
  max_members: number;
  max_expenses: number;
  features: string;
  stripe_price_id?: string;
  is_active: number;
  created_at: string;
}

export interface Payment {
  id: number;
  organization_id: number;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_id?: string;
  stripe_invoice_id?: string;
  description?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  organization_id?: number;
  user_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  details?: string;
  ip_address?: string;
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

export interface OrganizationWithRole extends Organization {
  role: string;
  member_count?: number;
}
