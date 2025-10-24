# Prompt for Claude Code (VS Code)

Copy and paste this into Claude Code:

---

I have a complete SaaS budget management application that I need to deploy using Docker. Here's the context:

## Current Project Structure

This is a full-stack TypeScript application with:
- **Backend**: Node.js + Express + TypeScript (in `/backend` folder)
- **Frontend**: React + TypeScript + Vite (in `/frontend` folder)
- **Database**: SQLite (will be created on first run)

## What Already Exists

I already have these Docker-related files in the root directory:
1. `Dockerfile.backend` - Backend container configuration
2. `Dockerfile.frontend` - Frontend container configuration
3. `docker-compose.yml` - Orchestration file
4. `nginx.conf` - Nginx configuration for frontend

## What I Need You To Do

Please help me deploy this application using Docker by doing the following:

### Step 1: Environment Configuration
1. Check if `backend/.env` exists
2. If not, copy `backend/.env.example` to `backend/.env`
3. Update the following environment variables in `backend/.env` for Docker deployment:
   - Set `APP_URL=http://localhost:3000`
   - Set `API_URL=http://localhost:3001`
   - Keep JWT_SECRET as is (or generate a new secure one)
   - Email settings can stay as development defaults

### Step 2: Verify Docker Files
1. Review the `docker-compose.yml` file
2. Make sure it's configured to:
   - Build both backend and frontend services
   - Expose backend on port 3001
   - Expose frontend on port 3000 (via Nginx)
   - Mount the database file as a volume so data persists

### Step 3: Build and Run
1. Build the Docker containers using `docker-compose build`
2. Start the containers using `docker-compose up -d`
3. Verify both services are running with `docker-compose ps`

### Step 4: Test the Deployment
1. Check if the backend is healthy: `curl http://localhost:3001/api/health`
2. Verify frontend is accessible at `http://localhost:3000`
3. Check container logs if there are any issues: `docker-compose logs`

### Step 5: Provide Instructions
After successful deployment, please provide me with:
1. Confirmation that all containers are running
2. URLs to access the application:
   - Frontend URL
   - Backend API URL
3. How to view logs: `docker-compose logs -f`
4. How to stop: `docker-compose down`
5. How to restart: `docker-compose restart`

## Expected Outcome

After completion, I should be able to:
- Access the frontend at `http://localhost:3000`
- The API should be available at `http://localhost:3001`
- Register new users and test all features
- Data should persist even after stopping containers

## Troubleshooting

If you encounter any issues:
1. Check if ports 3000 and 3001 are already in use
2. Verify Docker and Docker Compose are installed
3. Check container logs for errors
4. Ensure all necessary files exist in the project

## Additional Context

This is a production-ready SaaS application with:
- Multi-tenancy (organizations)
- Subscription management
- User authentication
- Expense tracking and splitting
- Admin panel
- Email notifications

The application has been fully tested and all backend APIs are working. The database schema will be automatically created on first backend startup.

Please proceed with the Docker deployment and let me know each step as you complete it.

---

## Alternative Shorter Prompt (if you prefer brief)

---

Deploy my Budget SaaS app using Docker:

1. Copy `backend/.env.example` to `backend/.env` if it doesn't exist
2. Run `docker-compose build` to build containers
3. Run `docker-compose up -d` to start services
4. Test with `curl http://localhost:3001/api/health`
5. Confirm frontend works at `http://localhost:3000`

The Docker files (`Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `nginx.conf`) already exist in the project root.

Let me know when both services are running and provide access URLs.

---

## What to Expect from Claude Code

Claude Code will:
✅ Check your Docker configuration files
✅ Set up environment variables
✅ Build the Docker images
✅ Start the containers
✅ Run health checks
✅ Provide you with URLs and instructions

## After Deployment

Once deployed, you can:
- Access app: http://localhost:3000
- API docs: http://localhost:3001/api/health
- View logs: `docker-compose logs -f`
- Stop: `docker-compose down`
- Restart: `docker-compose restart`

## Pro Tips for Claude Code

You can also ask Claude Code to:
- "Add a .dockerignore file to optimize build"
- "Create a production docker-compose file with better security"
- "Add health checks to docker-compose.yml"
- "Set up Docker volumes for persistent data"
- "Create a deployment script for one-command setup"
