# Budget App - SaaS Platform

A complete **multi-user budget management SaaS application** with organizations, team collaboration, subscription management, and admin panel. Built for production with enterprise-grade features.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Core Features
- **Multi-Tenancy**: Organizations/workspaces for team collaboration
- **Expense Tracking**: Track, split, and manage shared expenses
- **Smart Settlements**: Automatic calculation of who owes whom
- **Team Management**: Invite members, assign roles, manage permissions
- **Real-time Dashboard**: Overview of expenses, balances, and settlements

### SaaS Features
- **Subscription Plans**: Free, Pro, and Business tiers
- **Stripe Integration**: Secure payment processing and subscription management
- **Email Notifications**: Welcome emails, invitations, password reset, verification
- **User Authentication**: JWT-based auth with email verification
- **Role-Based Access**: Owner, Admin, and Member roles
- **Activity Logging**: Track all user and system activities
- **Admin Panel**: Comprehensive admin dashboard with analytics

### Security & Performance
- **Rate Limiting**: Protect against abuse and DDoS
- **Security Headers**: Helmet.js for security best practices
- **Input Validation**: Joi schemas for all inputs
- **Password Reset**: Secure token-based password recovery
- **Email Verification**: Prevent spam accounts

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js with TypeScript
- **Database**: SQLite (easily portable to PostgreSQL/MySQL)
- **Authentication**: JWT + bcrypt
- **Payments**: Stripe API
- **Email**: Nodemailer (SMTP)
- **Security**: Helmet, express-rate-limit
- **Validation**: Joi

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **State Management**: Context API

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (for production)
- **Logging**: Morgan

## Architecture

### Multi-Tenancy Model
```
User → Organization → Members → Expenses
  ↓        ↓            ↓
Profile  Settings    Splits → Settlements
         Subscription
```

### Database Schema
- **users**: User accounts with authentication
- **organizations**: Workspaces for teams
- **organization_members**: Team membership with roles
- **expenses**: Expense records
- **expense_splits**: Split details for each expense
- **invitations**: Team invitations
- **subscription_plans**: Available pricing tiers
- **payments**: Payment history
- **activity_logs**: Audit trail

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- Git
- (Optional) Docker and Docker Compose

### Installation

#### Option 1: Traditional Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd hippohightech
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure environment**
```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env with your settings
# Required:
# - JWT_SECRET: Random secure string
# - SMTP settings: For email functionality
# - Stripe keys: For payment processing
```

4. **Run the application**
```bash
# Development mode (both frontend and backend)
npm run dev

# Or run separately:
npm run dev:backend  # Backend on :3001
npm run dev:frontend # Frontend on :3000
```

#### Option 2: Docker Setup

1. **Clone and configure**
```bash
git clone <repository-url>
cd hippohightech
cp backend/.env.example .env
# Edit .env with your configuration
```

2. **Run with Docker Compose**
```bash
docker-compose up -d
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Configuration

### Environment Variables

Create `backend/.env` with the following:

```bash
# Server
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key

# Stripe (get from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@budgetapp.com
FROM_NAME=Budget App

# URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:3001

# Admin
ADMIN_EMAIL=admin@budgetapp.com
ADMIN_PASSWORD=ChangeThisPassword123!
```

### Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Create Products and Prices:
   - Free Plan: $0/month
   - Pro Plan: $19/month
   - Business Plan: $49/month
4. Copy the Price IDs to your database
5. Set up webhook endpoint: `https://your-domain.com/api/subscriptions/webhook`

### Email Setup

For Gmail:
1. Enable 2FA on your Google account
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

For production, use services like:
- SendGrid
- AWS SES
- Mailgun
- Postmark

## Usage Guide

### For Users

#### 1. Sign Up
- Visit the app and click "Register"
- Verify your email address
- A default workspace is created automatically

#### 2. Create Organization
- Create additional organizations for different groups
- Invite team members via email
- Assign roles (Admin or Member)

#### 3. Add Expenses
- Click "+ Add Expense"
- Enter details (description, amount, date, category)
- Select who shares the expense
- Choose split amounts (equal or custom)

#### 4. View Settlements
- Dashboard shows who owes whom
- Simplified settlements minimize transactions
- Export data (Pro/Business plans)

#### 5. Upgrade Plan
- Go to Organization Settings
- Choose a plan (Pro or Business)
- Complete payment via Stripe Checkout
- Enjoy enhanced limits and features

### For Admins

#### Access Admin Panel
1. Set up admin user (see Configuration)
2. Log in with admin account
3. Access `/admin` routes via API

#### Admin Features
- View all users and organizations
- Monitor subscription revenue
- Track system activity
- Manage users (delete, modify permissions)
- Override subscriptions
- View payment history

## API Documentation

### Authentication
```
POST /api/auth/register          - Register new user
POST /api/auth/login             - Login
POST /api/auth/forgot-password   - Request password reset
POST /api/auth/reset-password    - Reset password
POST /api/auth/logout            - Logout
GET  /api/auth/verify-email/:token - Verify email
POST /api/auth/resend-verification - Resend verification
```

### Organizations
```
GET    /api/organizations                    - List user's organizations
POST   /api/organizations                    - Create organization
GET    /api/organizations/:id                - Get organization details
PUT    /api/organizations/:id                - Update organization
DELETE /api/organizations/:id                - Delete organization
GET    /api/organizations/:id/members        - List members
POST   /api/organizations/:id/invite         - Invite member
DELETE /api/organizations/:id/members/:uid   - Remove member
PUT    /api/organizations/:id/members/:uid   - Update member role
```

### Expenses (scoped to organization)
```
GET    /api/expenses?organization_id=:id     - List expenses
POST   /api/expenses                         - Create expense
PUT    /api/expenses/:id                     - Update expense
DELETE /api/expenses/:id                     - Delete expense
GET    /api/expenses/settlements?organization_id=:id - Get settlements
```

### Subscriptions
```
GET  /api/subscriptions/plans                      - List plans
GET  /api/subscriptions/current/:orgId             - Current subscription
POST /api/subscriptions/checkout/:orgId            - Create checkout session
POST /api/subscriptions/portal/:orgId              - Create portal session
POST /api/subscriptions/webhook                    - Stripe webhook
```

### Admin (requires admin role)
```
GET    /api/admin/stats                  - Dashboard statistics
GET    /api/admin/users                  - List all users
GET    /api/admin/organizations          - List all organizations
GET    /api/admin/activity               - Activity logs
GET    /api/admin/payments               - Payment history
PUT    /api/admin/users/:id/admin        - Toggle admin status
DELETE /api/admin/users/:id              - Delete user
PUT    /api/admin/organizations/:id/subscription - Update subscription
```

## Subscription Plans

### Free Plan
- **Price**: $0/month
- **Features**:
  - Up to 3 members
  - 50 expenses per month
  - Basic expense tracking
  - Settlement calculations

### Pro Plan
- **Price**: $19/month
- **Features**:
  - Up to 10 members
  - 500 expenses per month
  - Priority support
  - Export data (CSV/PDF)
  - Advanced categories

### Business Plan
- **Price**: $49/month
- **Features**:
  - Up to 50 members
  - Unlimited expenses
  - Priority support
  - API access
  - Advanced reports
  - Custom categories
  - Dedicated support

## Deployment

### Production Deployment

#### Using Docker (Recommended)

```bash
# 1. Clone repository
git clone <repo-url>
cd hippohightech

# 2. Set environment variables
cp backend/.env.example .env
# Edit .env with production values

# 3. Build and deploy
docker-compose -f docker-compose.yml up -d

# 4. Set up reverse proxy (Nginx/Caddy)
# 5. Configure SSL (Let's Encrypt)
# 6. Set up domain DNS
```

#### Manual Deployment

```bash
# Build backend
cd backend
npm ci --only=production
npm run build

# Build frontend
cd ../frontend
npm ci
npm run build

# Deploy built files
# - Backend: dist/ folder
# - Frontend: dist/ folder to CDN or static host
```

### Deployment Platforms

#### Recommended Platforms
- **Backend**: Railway, Render, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Database**: Upgrade to PostgreSQL on production (PlanetScale, Supabase, Neon)
- **Email**: SendGrid, AWS SES, Postmark

#### Environment Checklist
- [ ] Set strong JWT_SECRET
- [ ] Configure production SMTP
- [ ] Set up Stripe production keys
- [ ] Configure Stripe webhooks
- [ ] Set up SSL/TLS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure backup strategy
- [ ] Set up CDN for assets

## Project Structure

```
hippohightech/
├── backend/
│   ├── src/
│   │   ├── middleware/       # Auth, organization, rate limiting
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Email, Stripe integration
│   │   ├── utils/            # Helpers, validators, logger
│   │   ├── database.ts       # Database setup
│   │   ├── types.ts          # TypeScript definitions
│   │   └── index.ts          # Server entry point
│   ├── .env                  # Environment variables
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # State management
│   │   ├── api.ts            # API client
│   │   ├── types.ts          # TypeScript definitions
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile.backend        # Backend container
├── Dockerfile.frontend       # Frontend container
├── docker-compose.yml        # Docker orchestration
├── nginx.conf                # Nginx configuration
└── README.md
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations
When upgrading from v1 to v2:
```bash
# Backup existing database
cp backend/budget.db backend/budget.db.backup

# Run migrations (auto-runs on start)
npm run dev:backend
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Security Best Practices

### Implemented
- JWT authentication with expiration
- Password hashing with bcrypt (10 rounds)
- Rate limiting on auth endpoints
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection (helmet.js)
- CSRF protection
- Secure session management

### Recommendations
- Regularly rotate JWT_SECRET
- Use strong admin passwords
- Enable 2FA (future feature)
- Monitor activity logs
- Set up alerts for suspicious activity
- Regular security audits
- Keep dependencies updated

## Troubleshooting

### Common Issues

**Issue**: Email not sending
- Check SMTP credentials
- Verify firewall allows SMTP port
- Check spam folder
- Try different SMTP provider

**Issue**: Stripe webhook failing
- Verify webhook secret
- Check endpoint accessibility
- Review Stripe dashboard logs

**Issue**: Database locked
- Close other connections
- Restart backend server
- Consider upgrading to PostgreSQL

**Issue**: CORS errors
- Update CORS configuration in backend
- Check APP_URL matches frontend

## License

MIT License - see LICENSE file

## Support

- **Documentation**: This README
- **Issues**: GitHub Issues
- **Email**: support@budgetapp.com
- **Community**: Discord/Slack (coming soon)

## Roadmap

### Q1 2025
- [ ] Mobile apps (React Native)
- [ ] Two-factor authentication
- [ ] Recurring expenses
- [ ] Receipt OCR scanning
- [ ] Multi-currency support

### Q2 2025
- [ ] Budget forecasting
- [ ] Expense analytics/charts
- [ ] Integrations (QuickBooks, Xero)
- [ ] API documentation (Swagger)
- [ ] Bulk import/export

### Q3 2025
- [ ] White-label solution
- [ ] Enterprise SSO
- [ ] Advanced reporting
- [ ] Custom workflows
- [ ] Mobile notifications

## Credits

Built with:
- Express.js
- React
- TypeScript
- Stripe
- SQLite
- And many other amazing open-source projects

---

**Ready for Production** ✅

This is a complete SaaS application ready to launch. Configure your environment, set up Stripe, deploy, and start accepting customers!
