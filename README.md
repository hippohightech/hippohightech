# Shared Budget App

A multi-user budget management application that allows 2 or more users to track and share expenses. Built with React, TypeScript, Node.js, Express, and SQLite.

## Features

- **User Authentication**: Secure registration and login system with JWT tokens
- **Multi-User Support**: Multiple users can register and collaborate
- **Expense Tracking**: Add, edit, and delete shared expenses
- **Smart Splitting**: Split expenses between multiple users with customizable amounts
- **Automatic Settlements**: Calculates who owes whom and how much
- **Balance Overview**: See your current balance with each user
- **Categories**: Organize expenses by category (Food, Transportation, Entertainment, etc.)
- **Date Tracking**: Track when expenses occurred
- **Real-time Updates**: See all shared expenses instantly

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- SQLite database
- JWT authentication
- bcryptjs for password hashing

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- Context API for state management
- Axios for API calls

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hippohightech
```

2. Install dependencies for all packages:
```bash
npm run install:all
```

This will install dependencies for the root project, backend, and frontend.

### Running the Application

#### Development Mode

You can run both backend and frontend simultaneously:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend (runs on port 3001)
npm run dev:backend

# Terminal 2 - Frontend (runs on port 3000)
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Building for Production

```bash
npm run build
```

This builds both the backend and frontend for production.

## Usage Guide

### 1. Register Users

- Open http://localhost:3000
- Click "Register" to create a new account
- Fill in username, email, and password
- You can register multiple users by logging out and registering again

### 2. Add Expenses

- Click "+ Add Expense" button
- Fill in expense details:
  - Description (e.g., "Dinner at restaurant")
  - Amount (total cost)
  - Category
  - Date
- Add splits:
  - Select users who share the expense
  - Enter the amount each person owes
  - Or click "Split Evenly" to divide equally
- Click "Create"

### 3. View Balances and Settlements

The dashboard shows:
- **Recent Expenses**: All expenses you're involved in
- **Your Balance**: How much each person owes you or you owe them
- **Settlements**: Simplified payment suggestions to settle all debts

### 4. Edit/Delete Expenses

- You can only edit or delete expenses you created
- Click "Edit" to modify an expense
- Click "Delete" to remove an expense

## Project Structure

```
hippohightech/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   ├── users.ts         # User management endpoints
│   │   │   └── expenses.ts      # Expense management endpoints
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT authentication middleware
│   │   ├── database.ts          # SQLite database setup
│   │   ├── types.ts             # TypeScript type definitions
│   │   └── index.ts             # Express server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.tsx         # Login/Register component
│   │   │   ├── Dashboard.tsx    # Main dashboard
│   │   │   └── ExpenseForm.tsx  # Add/Edit expense form
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Authentication context
│   │   ├── api.ts               # API client
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── App.tsx              # Main app component
│   │   ├── App.css              # Styles
│   │   └── main.tsx             # React entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── package.json                  # Root package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users` - Get all users (authenticated)
- `GET /api/users/me` - Get current user info
- `GET /api/users/search?q=query` - Search users

### Expenses
- `GET /api/expenses` - Get all expenses for current user
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense
- `GET /api/expenses/settlements` - Get balance and settlement calculations

## Database Schema

### Users Table
- id, username, email, password, created_at

### Expenses Table
- id, description, amount, paid_by, category, date, created_at

### Expense Splits Table
- id, expense_id, user_id, share_amount

### Groups Table (for future enhancement)
- id, name, created_by, created_at

### Group Members Table
- id, group_id, user_id, joined_at

## Example Workflow

1. **Alice** and **Bob** are roommates
2. Alice pays $60 for groceries
3. Alice creates an expense:
   - Description: "Groceries"
   - Amount: $60
   - Splits: Alice $30, Bob $30
4. Bob sees he owes Alice $30
5. Later, Bob pays $40 for utilities
6. Bob creates an expense with even split
7. Now the settlement shows: Alice owes Bob $10 (net difference)

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Protected API routes require valid tokens
- CORS enabled for development

## Future Enhancements

- [ ] Group management for organizing multiple users
- [ ] Receipt image upload
- [ ] Export expenses to CSV/PDF
- [ ] Payment tracking (mark settlements as paid)
- [ ] Recurring expenses
- [ ] Expense statistics and charts
- [ ] Mobile app
- [ ] Email notifications
- [ ] Multi-currency support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
