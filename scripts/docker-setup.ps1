# Docker Setup Script for Government Lending CRM (PowerShell)
# This script helps set up the Docker environment on Windows

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Government Lending CRM - Docker Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Visit: https://docs.docker.com/desktop/install/windows-install/" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is installed
try {
    $composeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is installed: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    if (Test-Path .env.docker) {
        Copy-Item .env.docker .env
        Write-Host "✅ .env file created from .env.docker" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env and update the passwords and secrets!" -ForegroundColor Yellow
    } elseif (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "✅ .env file created from .env.example" -ForegroundColor Green
        Write-Host "⚠️  Please edit .env and update the configuration!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ No template file found (.env.docker or .env.example)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Create necessary directories
Write-Host ""
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path uploads, logs, backups | Out-Null
Write-Host "✅ Directories created" -ForegroundColor Green

# Ask user which mode to run
Write-Host ""
Write-Host "Select deployment mode:" -ForegroundColor Cyan
Write-Host "1) Development (with hot-reload)"
Write-Host "2) Production"
$mode = Read-Host "Enter choice [1-2]"

switch ($mode) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Starting services in development mode..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    }
    "2" {
        Write-Host ""
        Write-Host "🚀 Starting services in production mode..." -ForegroundColor Yellow
        docker-compose up -d
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

# Wait for services to be ready
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host ""
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow
docker-compose ps

# Run migrations
Write-Host ""
$runMigrations = Read-Host "Run database migrations? [y/N]"
if ($runMigrations -match "^[Yy]$") {
    Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
    docker-compose exec -T api npm run migrate
    Write-Host "✅ Migrations completed" -ForegroundColor Green
}

# Seed database
Write-Host ""
$runSeed = Read-Host "Seed database with test data? [y/N]"
if ($runSeed -match "^[Yy]$") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
    docker-compose exec -T api npm run seed
    Write-Host "✅ Database seeded" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API is running at: http://localhost:3000" -ForegroundColor White
Write-Host "Health check: http://localhost:3000/api/v1/health" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  docker-compose logs -f        # View logs"
Write-Host "  docker-compose ps             # Check status"
Write-Host "  docker-compose down           # Stop services"
Write-Host ""
Write-Host "For more information, see docs/DOCKER.md" -ForegroundColor Yellow
Write-Host ""
