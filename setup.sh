#!/bin/bash

# Setup script for BudgetRadar Local Implementation

echo "🚀 Setting up BudgetRadar Local Environment..."

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    exit 1
fi

# Check for Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please ensure you have a recent version of Docker Desktop."
    exit 1
fi

echo "✅ Docker check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
else
    echo "ℹ️  .env file already exists, skipping creation."
fi

echo "✅ Configuration setup complete"

echo ""
echo "🎉 Setup finished! To start the application:"
echo "   docker-compose up --build"
echo ""
echo "backend will be available at http://localhost:8000"
echo "frontend will be available at http://localhost:3000"
