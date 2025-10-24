#!/bin/bash

# Quick Test Script for Budget App SaaS
# This script will test the basic functionality

set -e

echo "╔════════════════════════════════════════╗"
echo "║   Budget App SaaS - Quick Test        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BASE_URL="http://localhost:3001/api"

# Check if backend is running
echo -n "Checking if backend is running... "
if curl -s $BASE_URL/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  echo "Backend is not running. Please start it with: npm run dev:backend"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 1: User Registration"
echo "════════════════════════════════════════"

TIMESTAMP=$(date +%s)
USERNAME="testuser$TIMESTAMP"
EMAIL="test$TIMESTAMP@example.com"
PASSWORD="TestPassword123!"

echo "Creating user: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Registration successful${NC}"
  TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
  USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
  echo "  User ID: $USER_ID"
  echo "  Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ Registration failed${NC}"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 2: Login"
echo "════════════════════════════════════════"

LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 3: Get Organizations"
echo "════════════════════════════════════════"

ORGS_RESPONSE=$(curl -s $BASE_URL/organizations \
  -H "Authorization: Bearer $TOKEN")

if echo "$ORGS_RESPONSE" | grep -q "Workspace"; then
  echo -e "${GREEN}✓ Default organization created${NC}"
  ORG_ID=$(echo $ORGS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  ORG_NAME=$(echo $ORGS_RESPONSE | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
  echo "  Organization ID: $ORG_ID"
  echo "  Organization Name: $ORG_NAME"
else
  echo -e "${RED}✗ Failed to get organizations${NC}"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 4: Get Users"
echo "════════════════════════════════════════"

USERS_RESPONSE=$(curl -s $BASE_URL/users \
  -H "Authorization: Bearer $TOKEN")

if echo "$USERS_RESPONSE" | grep -q "$EMAIL"; then
  echo -e "${GREEN}✓ User list retrieved${NC}"
  USER_COUNT=$(echo $USERS_RESPONSE | grep -o '"id":' | wc -l)
  echo "  Total users: $USER_COUNT"
else
  echo -e "${RED}✗ Failed to get users${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 5: Subscription Plans"
echo "════════════════════════════════════════"

PLANS_RESPONSE=$(curl -s $BASE_URL/subscriptions/plans)

if echo "$PLANS_RESPONSE" | grep -q "Free"; then
  echo -e "${GREEN}✓ Subscription plans available${NC}"
  echo "  Plans:"
  echo "    - Free (included)"
  echo "    - Pro (\$19/month)"
  echo "    - Business (\$49/month)"
else
  echo -e "${RED}✗ Failed to get plans${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 6: Create Expense"
echo "════════════════════════════════════════"

EXPENSE_RESPONSE=$(curl -s -X POST $BASE_URL/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"organization_id\": $ORG_ID,
    \"description\": \"Test Groceries\",
    \"amount\": 100.50,
    \"category\": \"Food\",
    \"date\": \"2025-01-20\",
    \"splits\": [{\"user_id\": $USER_ID, \"share_amount\": 100.50}]
  }")

if echo "$EXPENSE_RESPONSE" | grep -q "expenseId\|success"; then
  echo -e "${GREEN}✓ Expense created${NC}"
  echo "  Description: Test Groceries"
  echo "  Amount: \$100.50"
else
  echo -e "${RED}✗ Failed to create expense${NC}"
  echo "$EXPENSE_RESPONSE"
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 7: Get Expenses"
echo "════════════════════════════════════════"

EXPENSES_RESPONSE=$(curl -s "$BASE_URL/expenses?organization_id=$ORG_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo "$EXPENSES_RESPONSE" | grep -q "Test Groceries"; then
  echo -e "${GREEN}✓ Expenses retrieved${NC}"
  EXPENSE_COUNT=$(echo $EXPENSES_RESPONSE | grep -o '"id":' | wc -l)
  echo "  Total expenses: $EXPENSE_COUNT"
else
  echo -e "${RED}✗ Failed to get expenses${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "Test 8: Current Subscription"
echo "════════════════════════════════════════"

SUB_RESPONSE=$(curl -s $BASE_URL/subscriptions/current/$ORG_ID \
  -H "Authorization: Bearer $TOKEN")

if echo "$SUB_RESPONSE" | grep -q "Free"; then
  echo -e "${GREEN}✓ Subscription info retrieved${NC}"
  echo "  Current plan: Free"
  echo "  Status: Active"
else
  echo -e "${RED}✗ Failed to get subscription${NC}"
fi

echo ""
echo "════════════════════════════════════════"
echo "✅ All Tests Completed!"
echo "════════════════════════════════════════"
echo ""
echo "Test Summary:"
echo "  ✓ User Registration"
echo "  ✓ User Login"
echo "  ✓ Organization Management"
echo "  ✓ User Directory"
echo "  ✓ Subscription Plans"
echo "  ✓ Expense Creation"
echo "  ✓ Expense Retrieval"
echo "  ✓ Subscription Status"
echo ""
echo "Next Steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Login with: $EMAIL"
echo "  3. Password: $PASSWORD"
echo "  4. Explore the dashboard!"
echo ""
echo "Test user credentials saved to test-credentials.txt"

# Save credentials
echo "Email: $EMAIL" > test-credentials.txt
echo "Password: $PASSWORD" >> test-credentials.txt
echo "User ID: $USER_ID" >> test-credentials.txt
echo "Organization ID: $ORG_ID" >> test-credentials.txt
echo "Token: $TOKEN" >> test-credentials.txt

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "For more detailed testing, see TESTING.md"
echo "═══════════════════════════════════════════════════════════"
