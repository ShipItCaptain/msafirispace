#!/bin/bash

# Msafiri Space Development Server Startup Script
# This script starts both the Django backend and React frontend development servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}🚀 Msafiri Space Development Server${NC}"
    echo -e "${PURPLE}================================${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill processes on specific ports
kill_port() {
    if port_in_use $1; then
        print_warning "Port $1 is already in use. Attempting to free it..."
        lsof -ti :$1 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down development servers..."
    # Kill background processes
    jobs -p | xargs kill 2>/dev/null || true
    print_success "Cleanup completed"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_header

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists python3; then
    print_error "Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Prerequisites check passed!"

# Check if we're in the right directory
if [ ! -f "backend/manage.py" ] || [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from the project root directory (where backend/ and frontend/ folders are located)"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    print_error "Virtual environment not found. Please run ./setup.sh first to set up the project."
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        print_success ".env file created from template"
    else
        print_error "No env.example file found. Please create a .env file manually."
        exit 1
    fi
fi

# Activate virtual environment
print_status "Activating Python virtual environment..."
source backend/venv/bin/activate
print_success "Virtual environment activated"

# Normalize DEBUG env for Django/decouple.
# A shell-level DEBUG value like "release" breaks boolean casting in settings.
case "${DEBUG:-}" in
  ""|True|False|true|false|1|0|yes|no|on|off)
    ;;
  *)
    print_warning "Ignoring invalid shell DEBUG='$DEBUG' for local dev run"
    unset DEBUG
    ;;
esac

# Install/update backend dependencies
print_status "Checking backend dependencies..."
cd backend
pip install -r requirements.txt >/dev/null 2>&1
print_success "Backend dependencies are up to date"

# Run database migrations
print_status "Running database migrations..."
python manage.py migrate --noinput
print_success "Database migrations completed"

# Collect static files (for development)
print_status "Collecting static files..."
python manage.py collectstatic --noinput >/dev/null 2>&1
print_success "Static files collected"

# Check if frontend dependencies are installed
cd ../frontend
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install --no-audit --no-fund || {
        print_warning "npm install failed, but continuing..."
    }
    print_success "Frontend dependencies installed"
else
    print_status "Checking frontend dependencies..."
    npm install --no-audit --no-fund --silent || {
        print_warning "npm install check failed, but continuing..."
    }
    print_success "Frontend dependencies are up to date"
fi

# Free up ports if they're in use
print_status "Checking for port conflicts..."
kill_port 8000
kill_port 3000

# Start Django backend server
print_status "Starting Django backend server on port 8000..."
cd ../backend
python manage.py runserver 127.0.0.1:8000 --noreload &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! port_in_use 8000; then
    print_error "Failed to start Django backend server"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "Django backend server started successfully (PID: $BACKEND_PID)"

# Start React frontend server
print_status "Starting React frontend server on port 3000..."
cd ../frontend
DANGEROUSLY_DISABLE_HOST_CHECK=true HOST=127.0.0.1 PORT=3000 WDS_SOCKET_HOST=127.0.0.1 npm start &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! port_in_use 3000; then
    print_error "Failed to start React frontend server"
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "React frontend server started successfully (PID: $FRONTEND_PID)"

# Display server information
echo ""
print_success "🎉 Development servers are running!"
echo ""
echo -e "${CYAN}📊 Server Information:${NC}"
echo -e "  Backend (Django):  ${GREEN}http://localhost:8000${NC}"
echo -e "  Frontend (React):  ${GREEN}http://localhost:3000${NC}"
echo -e "  Admin Panel:       ${GREEN}http://localhost:8000/admin/${NC}"
echo -e "  API Documentation: ${GREEN}http://localhost:8000/api/docs/${NC}"
echo ""
echo -e "${CYAN}🔧 Process Information:${NC}"
echo -e "  Backend PID: $BACKEND_PID"
echo -e "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "  • Press ${RED}Ctrl+C${NC} to stop all servers"
echo -e "  • Backend logs: Check terminal output above"
echo -e "  • Frontend logs: Check terminal output above"
echo -e "  • Database: SQLite (backend/db.sqlite3)"
echo ""
echo -e "${PURPLE}Happy coding! 🚀${NC}"

# Wait for user to stop the servers
wait
