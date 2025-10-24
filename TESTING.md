# Testing Guide

## Quick Start Testing

### 1. Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all
```

### 2. Start the Application

```bash
# Option A: Run both backend and frontend together
npm run dev

# Option B: Run separately (in different terminals)
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## Testing User Features

### Test 1: User Registration & Email Verification

1. **Register First User**
   - Go to http://localhost:3000
   - Click "Register"
   - Fill in:
     - Username: `alice`
     - Email: `alice@test.com`
     - Password: `Password123!`
   - Click "Register"

2. **Check Email Verification**
   - In backend console, you'll see email preview URL (development mode)
   - Copy the verification link from console
   - Or check the `email_verification_token` in database

3. **Verify Email**
   - Visit: `http://localhost:3000/verify-email?token=<token>`
   - Or call API: `GET http://localhost:3001/api/auth/verify-email/<token>`

### Test 2: Create Organization

1. **Login**
   - Use alice@test.com / Password123!
   - You should be automatically logged in after registration

2. **View Default Organization**
   - A default organization "alice's Workspace" is created automatically
   - Check dashboard to see it

3. **Create New Organization**
   ```bash
   # Via API
   curl -X POST http://localhost:3001/api/organizations \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your-token>" \
     -d '{
       "name": "Family Budget",
       "description": "Our family expense tracker"
     }'
   ```

### Test 3: Invite Team Members

1. **Register Second User**
   - Open incognito/private window
   - Register: `bob@test.com` / `Password123!`

2. **Invite Bob to Alice's Organization**
   ```bash
   curl -X POST http://localhost:3001/api/organizations/1/invite \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <alice-token>" \
     -d '{
       "email": "bob@test.com",
       "role": "member"
     }'
   ```

3. **Check Invitation Email**
   - Check backend console for invitation email preview
   - Copy invitation token

4. **Accept Invitation (as Bob)**
   ```bash
   curl -X POST http://localhost:3001/api/invitations/accept/<token> \
     -H "Authorization: Bearer <bob-token>"
   ```

### Test 4: Add Expenses

1. **Create Expense (Split Between Alice and Bob)**
   ```bash
   curl -X POST http://localhost:3001/api/expenses \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <alice-token>" \
     -d '{
       "organization_id": 1,
       "description": "Groceries",
       "amount": 100,
       "category": "Food",
       "date": "2025-01-20",
       "splits": [
         {"user_id": 1, "share_amount": 50},
         {"user_id": 2, "share_amount": 50}
       ]
     }'
   ```

2. **View Expenses**
   ```bash
   curl http://localhost:3001/api/expenses?organization_id=1 \
     -H "Authorization: Bearer <alice-token>"
   ```

3. **View Settlements**
   ```bash
   curl http://localhost:3001/api/expenses/settlements?organization_id=1 \
     -H "Authorization: Bearer <alice-token>"
   ```

### Test 5: Subscription Plans

1. **View Available Plans**
   ```bash
   curl http://localhost:3001/api/subscriptions/plans
   ```

2. **View Current Subscription**
   ```bash
   curl http://localhost:3001/api/subscriptions/current/1 \
     -H "Authorization: Bearer <alice-token>"
   ```

3. **Test Subscription Limits**
   - Try adding 4th member (should fail on free plan)
   - Try adding 51st expense in a month (should fail on free plan)

### Test 6: Admin Features

1. **Create Admin User**
   ```bash
   # Direct database access
   sqlite3 backend/budget.db "UPDATE users SET is_admin = 1 WHERE email = 'alice@test.com'"
   ```

2. **Access Admin Stats**
   ```bash
   curl http://localhost:3001/api/admin/stats \
     -H "Authorization: Bearer <alice-token>"
   ```

3. **View All Users**
   ```bash
   curl http://localhost:3001/api/admin/users \
     -H "Authorization: Bearer <alice-token>"
   ```

4. **View All Organizations**
   ```bash
   curl http://localhost:3001/api/admin/organizations \
     -H "Authorization: Bearer <alice-token>"
   ```

## Testing with Postman

### Import This Collection

Create a Postman collection with these requests:

**Environment Variables:**
- `BASE_URL`: http://localhost:3001
- `TOKEN`: (will be set after login)

**Requests:**

1. **Register**
   - POST `{{BASE_URL}}/api/auth/register`
   - Body: `{"username": "alice", "email": "alice@test.com", "password": "Password123!"}`

2. **Login**
   - POST `{{BASE_URL}}/api/auth/login`
   - Body: `{"email": "alice@test.com", "password": "Password123!"}`
   - Test Script: `pm.environment.set("TOKEN", pm.response.json().token)`

3. **Get Organizations**
   - GET `{{BASE_URL}}/api/organizations`
   - Headers: `Authorization: Bearer {{TOKEN}}`

4. **Create Expense**
   - POST `{{BASE_URL}}/api/expenses`
   - Headers: `Authorization: Bearer {{TOKEN}}`

## Manual UI Testing Checklist

### User Flow
- [ ] Register new account
- [ ] Receive verification email (check console)
- [ ] Verify email
- [ ] Login successfully
- [ ] View default organization
- [ ] Create new organization
- [ ] Invite team member
- [ ] Accept invitation (as invited user)
- [ ] Add expense
- [ ] Split expense between members
- [ ] View settlements
- [ ] Edit expense
- [ ] Delete expense
- [ ] Update profile
- [ ] Change password
- [ ] Logout

### Admin Flow
- [ ] Login as admin
- [ ] View dashboard stats
- [ ] View all users
- [ ] View all organizations
- [ ] View activity logs
- [ ] View payments
- [ ] Modify user admin status
- [ ] Override subscription

## Database Testing

### View Data Directly

```bash
# Access SQLite database
sqlite3 backend/budget.db

# View users
SELECT * FROM users;

# View organizations
SELECT * FROM organizations;

# View expenses
SELECT * FROM expenses;

# View organization members
SELECT * FROM organization_members;

# View invitations
SELECT * FROM invitations;

# View subscription plans
SELECT * FROM subscription_plans;

# View activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;

# Exit
.quit
```

## Testing Email Functionality

### Development Mode

In development, emails are logged to console with preview URLs:

```bash
# Start backend and watch console
npm run dev:backend

# Register user - check console for email preview
# You'll see something like:
# Email sent: <message-id>
# Preview URL: https://ethereal.email/message/xxx
```

### Test with Real SMTP (Optional)

1. **Use Gmail**
   ```bash
   # In backend/.env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-app-password  # Generate in Google Account settings
   ```

2. **Use Mailtrap (Free Testing)**
   ```bash
   # Sign up at https://mailtrap.io
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=your-mailtrap-user
   SMTP_PASS=your-mailtrap-pass
   ```

## Testing Stripe Integration

### Without Real Stripe (Mock Mode)

The app works without Stripe configured:
- Subscription endpoints return data
- Checkout/portal require Stripe keys
- Use test mode for development

### With Stripe Test Mode

1. **Get Stripe Test Keys**
   - Sign up at https://stripe.com
   - Get test API keys from Dashboard

2. **Configure Environment**
   ```bash
   # In backend/.env
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```

3. **Create Test Products**
   - Go to Stripe Dashboard → Products
   - Create "Pro Plan" - $19/month
   - Create "Business Plan" - $49/month
   - Copy Price IDs

4. **Update Database**
   ```bash
   sqlite3 backend/budget.db
   UPDATE subscription_plans SET stripe_price_id = 'price_xxx' WHERE name = 'pro';
   UPDATE subscription_plans SET stripe_price_id = 'price_yyy' WHERE name = 'business';
   ```

5. **Test Checkout**
   ```bash
   curl -X POST http://localhost:3001/api/subscriptions/checkout/1 \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"plan_name": "pro"}'
   ```

6. **Use Test Cards**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - More at: https://stripe.com/docs/testing

## Performance Testing

### Test Rate Limiting

```bash
# Try rapid login attempts (should be limited to 5 per 15 min)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@test.com", "password": "wrong"}'
  echo "Attempt $i"
done
```

### Load Testing with Apache Bench

```bash
# Install apache2-utils
sudo apt-get install apache2-utils  # Ubuntu
brew install apache2-utils           # macOS

# Test API health endpoint
ab -n 1000 -c 10 http://localhost:3001/api/health
```

## Automated Testing Script

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧪 Testing Budget App API..."

# Test 1: Health Check
echo -n "Testing health endpoint... "
response=$(curl -s $BASE_URL/health)
if [[ $response == *"OK"* ]]; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED${NC}"
fi

# Test 2: Register
echo -n "Testing registration... "
response=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test$(date +%s)\",\"email\":\"test$(date +%s)@test.com\",\"password\":\"Test123!\"}")
if [[ $response == *"token"* ]]; then
  echo -e "${GREEN}✓ PASSED${NC}"
  TOKEN=$(echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗ FAILED${NC}"
  exit 1
fi

# Test 3: Get Organizations
echo -n "Testing get organizations... "
response=$(curl -s $BASE_URL/organizations \
  -H "Authorization: Bearer $TOKEN")
if [[ $response == *"["* ]]; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED${NC}"
fi

# Test 4: View Plans
echo -n "Testing subscription plans... "
response=$(curl -s $BASE_URL/subscriptions/plans)
if [[ $response == *"Free"* ]]; then
  echo -e "${GREEN}✓ PASSED${NC}"
else
  echo -e "${RED}✗ FAILED${NC}"
fi

echo ""
echo "✅ All tests completed!"
```

Run it:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Troubleshooting Tests

### Backend won't start
```bash
# Check if port is in use
lsof -i :3001
# Kill process if needed
kill -9 <PID>

# Check database
ls -la backend/budget.db
# If corrupted, delete and restart
rm backend/budget.db
npm run dev:backend
```

### Frontend won't start
```bash
# Clear cache
cd frontend
rm -rf node_modules dist
npm install
npm run dev
```

### Database is locked
```bash
# Close all connections
pkill -f "node.*index.ts"
# Restart
npm run dev:backend
```

## What to Expect

✅ **Working:**
- User registration/login
- Email verification (console logs)
- Organizations CRUD
- Team invitations
- Expense tracking
- Settlement calculations
- Admin panel APIs
- Rate limiting
- Activity logging

⚠️ **Requires Configuration:**
- Stripe payments (need API keys)
- Real email sending (need SMTP)
- Production deployment

---

**Ready to test!** Start with the Quick Start guide above 🚀
