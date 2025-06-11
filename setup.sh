#!/bin/bash

# Setup script for Duitku-Thinkific Partner App

echo "🚀 Setting up Duitku-Thinkific Partner App..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env .env.backup 2>/dev/null || true
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with actual API credentials"
echo "2. Run 'npm run dev' to start the backend server"
echo "3. In a new terminal, run 'cd frontend && npm start' to start the React app"
echo "4. Visit http://localhost:3001 to access the frontend"
echo "5. Create your Thinkific Partner App at https://partner.thinkific.com/apps/create"
echo ""
echo "📖 See documentation.md for complete setup instructions"
