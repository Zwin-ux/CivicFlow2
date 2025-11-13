#!/bin/bash

# Docker Setup Script for Government Lending CRM
# This script helps set up the Docker environment

set -e

echo "=========================================="
echo "Government Lending CRM - Docker Setup"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Docker Compose is installed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file from template..."
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo " .env file created from .env.docker"
        echo "Please edit .env and update the passwords and secrets"
    elif [ -f .env.example ]; then
        cp .env.example .env
        echo " .env file created from .env.example"
        echo "Please edit .env and update the configuration"
    else
        echo "No template file found (.env.docker or .env.example)"
        exit 1
    fi
else
    echo " .env file already exists"
fi

# Create necessary directories
echo ""
echo "Creating necessary directories..."
mkdir -p uploads logs backups
echo "Directories created"

# Ask user which mode to run
echo ""
echo "Select deployment mode:"
echo "1) Development (with hot-reload)"
echo "2) Production"
read -p "Enter choice [1-2]: " mode

case $mode in
    1)
        echo ""
        echo "Starting services in development mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
        ;;
    2)
        echo ""
        echo "Starting services in production mode..."
        docker-compose up -d
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "Checking service health..."
docker-compose ps

# Run migrations
echo ""
read -p "Run database migrations? [y/N]: " run_migrations
if [[ $run_migrations =~ ^[Yy]$ ]]; then
    echo "Running database migrations..."
    docker-compose exec -T api npm run migrate
    echo "Migrations completed"
fi

# Seed database
echo ""
read -p "Seed database with test data? [y/N]: " run_seed
if [[ $run_seed =~ ^[Yy]$ ]]; then
    echo "Seeding database..."
    docker-compose exec -T api npm run seed
    echo "Database seeded"
fi

echo ""
echo "=========================================="
echo "Setup Complete"
echo "=========================================="
echo ""
echo "API is running at: http://localhost:3000"
echo "Health check: http://localhost:3000/api/v1/health"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f        # View logs"
echo "  docker-compose ps             # Check status"
echo "  docker-compose down           # Stop services"
echo "  make help                     # View all available commands"
echo ""
echo "For more information, see docs/DOCKER.md"
echo ""
