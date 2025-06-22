#!/bin/bash

# CodeMarque Docker Setup Script
# Installs Docker and sets up Mermaid diagram generation

set -e

echo "🐳 CodeMarque Docker Setup for Mermaid Diagrams"
echo "================================================"

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if grep -q Microsoft /proc/version; then
            echo "wsl"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to check if running in container
in_container() {
    [ -f /.dockerenv ] || grep -q 'docker\|lxc' /proc/1/cgroup 2>/dev/null
}

# Detect environment
OS=$(detect_os)
echo "🔍 Detected OS: $OS"

if in_container; then
    echo "📦 Running inside a container"
    CONTAINER=true
else
    echo "💻 Running on host system"
    CONTAINER=false
fi

# Check if Docker is already installed
if command -v docker &> /dev/null; then
    echo "✅ Docker is already installed"
    docker --version
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        echo "✅ Docker daemon is running"
    else
        echo "⚠️  Docker daemon is not running"
        echo "💡 Start Docker daemon with: sudo systemctl start docker"
        echo "💡 Or on WSL: start Docker Desktop for Windows"
    fi
else
    echo "❌ Docker is not installed"
    
    # Installation instructions based on OS
    case $OS in
        "linux")
            echo "📥 Installing Docker on Linux..."
            
            # Update package index
            sudo apt-get update
            
            # Install dependencies
            sudo apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # Add Docker's official GPG key
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            
            # Set up repository
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
              $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Add user to docker group
            sudo usermod -aG docker $USER
            
            echo "✅ Docker installed successfully!"
            echo "💡 Log out and log back in for group changes to take effect"
            ;;
            
        "wsl")
            echo "🪟 WSL detected"
            echo "💡 For WSL, we recommend using Docker Desktop for Windows:"
            echo "   1. Download from: https://www.docker.com/products/docker-desktop/"
            echo "   2. Install Docker Desktop"
            echo "   3. Enable WSL 2 integration in Docker Desktop settings"
            echo "   4. Restart this script"
            echo ""
            echo "🔄 Alternative: Install Docker in WSL (advanced users):"
            echo "   Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
            ;;
            
        "macos")
            echo "🍎 macOS detected"
            echo "💡 Install Docker Desktop for Mac:"
            echo "   1. Download from: https://www.docker.com/products/docker-desktop/"
            echo "   2. Or use Homebrew: brew install --cask docker"
            ;;
            
        "windows")
            echo "🪟 Windows detected"
            echo "💡 Install Docker Desktop for Windows:"
            echo "   1. Download from: https://www.docker.com/products/docker-desktop/"
            echo "   2. Follow the installation guide"
            ;;
            
        *)
            echo "❓ Unknown OS detected"
            echo "💡 Please visit https://docs.docker.com/get-docker/ for installation instructions"
            ;;
    esac
fi

echo ""
echo "🎨 Setting up Mermaid CLI Docker image..."

# Pull Mermaid CLI image if Docker is available
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "📥 Pulling minlag/mermaid-cli image..."
    docker pull minlag/mermaid-cli
    echo "✅ Mermaid CLI image ready!"
    
    # Test Mermaid generation
    echo "🧪 Testing Mermaid generation..."
    
    # Create test directory
    mkdir -p temp/mermaid-test
    
    # Create test diagram
    cat > temp/mermaid-test/test.mmd << 'EOF'
graph TD
    A[Docker] --> B[Mermaid CLI]
    B --> C[PNG Image]
    C --> D[Discord Bot]
EOF
    
    # Generate test diagram
    if docker run --rm \
        -v "$(pwd)/temp/mermaid-test:/data" \
        minlag/mermaid-cli \
        -i /data/test.mmd \
        -o /data/test.png; then
        echo "✅ Mermaid generation test successful!"
        ls -la temp/mermaid-test/test.png
        
        # Cleanup
        rm -rf temp/mermaid-test
    else
        echo "❌ Mermaid generation test failed"
        echo "💡 Check Docker permissions and try again"
    fi
else
    echo "⚠️  Docker not available - Mermaid will use fallback mode"
    echo "💡 Users will see links to https://mermaid.live for diagram generation"
fi

echo ""
echo "🎯 Setup Summary:"
echo "=================="
echo "✅ Script completed"
echo "📊 Mermaid diagrams will be automatically generated from code blocks"
echo "🔄 Fallback to https://mermaid.live when Docker unavailable"
echo "🚀 Ready to deploy CodeMarque with Mermaid support!"

if [[ "$OS" == "wsl" && ! command -v docker &> /dev/null ]]; then
    echo ""
    echo "⚠️  WSL Notice:"
    echo "   Docker Desktop for Windows is recommended for the best experience"
    echo "   After installing, enable WSL 2 integration in Docker Desktop settings"
fi