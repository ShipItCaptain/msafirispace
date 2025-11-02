#!/bin/bash

echo "🚀 Setting up Msafiri Space - Hospitality Marketplace"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You can still run the app locally without Docker."
fi

echo "✅ Prerequisites check passed!"

# Create virtual environment for backend
echo "🐍 Setting up Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed!"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed!"

# Create .env file for backend
echo "🔧 Creating environment configuration..."
cd ../backend
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Environment file created. Please update .env with your configuration."
else
    echo "✅ Environment file already exists."
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p logs
mkdir -p static
mkdir -p media
echo "✅ Directories created!"

# Return to root
cd ..

echo ""
echo "🎉 Setup complete! Here's what you can do next:"
echo ""
echo "🔧 Backend setup:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python manage.py migrate"
echo "   python manage.py createsuperuser"
echo "   python manage.py runserver"
echo ""
echo "🎨 Frontend setup:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "🐳 Docker setup (optional):"
echo "   docker-compose up -d"
echo ""
echo "📚 Documentation:"
echo "   - Backend API: http://localhost:8000/api/docs/"
echo "   - Frontend: http://localhost:3000"
echo "   - Admin: http://localhost:8000/admin/"
echo ""
echo "Happy coding! 🚀"
