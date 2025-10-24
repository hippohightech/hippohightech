import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../budget.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table - enhanced for SaaS
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        avatar_url TEXT,
        is_admin INTEGER DEFAULT 0,
        is_email_verified INTEGER DEFAULT 0,
        email_verification_token TEXT,
        password_reset_token TEXT,
        password_reset_expires DATETIME,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Organizations table (workspaces for multi-tenancy)
    db.run(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        subscription_plan TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        max_members INTEGER DEFAULT 3,
        max_expenses INTEGER DEFAULT 50,
        trial_ends_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id)
      )
    `);

    // Organization members
    db.run(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(organization_id, user_id)
      )
    `);

    // Invitations
    db.run(`
      CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        token TEXT UNIQUE NOT NULL,
        invited_by INTEGER NOT NULL,
        accepted INTEGER DEFAULT 0,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id)
      )
    `);

    // Expenses table - now tied to organizations
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_by INTEGER NOT NULL,
        category TEXT,
        date DATE NOT NULL,
        receipt_url TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by) REFERENCES users(id)
      )
    `);

    // Expense splits table
    db.run(`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        share_amount REAL NOT NULL,
        FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Subscription plans
    db.run(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        price REAL NOT NULL,
        billing_period TEXT NOT NULL,
        max_members INTEGER NOT NULL,
        max_expenses INTEGER NOT NULL,
        features TEXT,
        stripe_price_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payment history
    db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL,
        stripe_payment_id TEXT,
        stripe_invoice_id TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )
    `);

    // Activity logs
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Settings table
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
      )
    `);

    // Insert default subscription plans
    db.run(`
      INSERT OR IGNORE INTO subscription_plans (name, display_name, price, billing_period, max_members, max_expenses, features)
      VALUES
        ('free', 'Free', 0, 'monthly', 3, 50, '{"basic_expenses": true, "3_members": true, "50_expenses_per_month": true}'),
        ('pro', 'Pro', 19, 'monthly', 10, 500, '{"unlimited_expenses": false, "10_members": true, "500_expenses_per_month": true, "priority_support": true, "export_data": true}'),
        ('business', 'Business', 49, 'monthly', 50, -1, '{"unlimited_expenses": true, "50_members": true, "priority_support": true, "export_data": true, "api_access": true, "custom_categories": true, "advanced_reports": true}')
    `);

    console.log('Database tables initialized');
  });
}

export default db;
