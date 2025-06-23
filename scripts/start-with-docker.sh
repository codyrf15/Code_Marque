#!/bin/bash

# CodeMarque Bot Startup Script with Docker Group Support
# Ensures PM2 runs with proper Docker permissions for Mermaid generation

set -e

echo "🚀 Starting CodeMarque Bot with Docker support..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check if Docker daemon is running (with proper group permissions)
if ! sg docker -c "docker info" &> /dev/null; then
    echo "❌ Docker daemon not accessible. Checking status..."
    
    # Check if daemon is actually running
    if sudo systemctl is-active docker &> /dev/null; then
        echo "✅ Docker daemon is running, but permissions need fixing..."
    else
        echo "🔄 Starting Docker daemon..."
        sudo systemctl start docker
        sleep 3
    fi
    
    # Test again with group permissions
    if ! sg docker -c "docker info" &> /dev/null; then
        echo "❌ Docker group permissions issue"
        echo "💡 Try logging out and back in, or run: newgrp docker"
        exit 1
    fi
fi

# Check if Mermaid CLI image is available
if ! sg docker -c "docker image inspect minlag/mermaid-cli" &> /dev/null; then
    echo "📥 Pulling Mermaid CLI image..."
    sg docker -c "docker pull minlag/mermaid-cli"
fi

echo "✅ Docker setup complete"

# Check if user is in docker group
if ! groups $USER | grep -q docker; then
    echo "❌ User $USER is not in docker group"
    echo "💡 Run: sudo usermod -aG docker $USER"
    echo "💡 Then logout and login again"
    exit 1
fi

echo "✅ Docker group membership confirmed"

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 kill &> /dev/null || true

# Create simple ecosystem config that just runs the wrapper with docker group
echo "🚀 Starting PM2 with Docker group permissions..."
sg docker -c "pm2 start scripts/bot-wrapper.sh --name codemarque-bot --output logs/out.log --error logs/error.log --merge-logs"

echo "✅ CodeMarque Bot started successfully!"
echo "📊 Mermaid diagrams will be automatically generated as PNG images"

# Show status
sg docker -c "pm2 status"

echo ""
echo "💡 To view logs: pm2 logs codemarque-bot"
echo "💡 To restart: pm2 restart codemarque-bot"
echo "💡 To stop: pm2 stop codemarque-bot" 