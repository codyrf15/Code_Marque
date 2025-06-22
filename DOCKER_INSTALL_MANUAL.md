# 🐳 Manual Docker Installation Guide for CodeMarque

Since this environment requires manual Docker installation, here are the steps you need to take:

## For WSL2 Environment (Recommended)

### Option 1: Docker Desktop for Windows (Easiest)

1. **Download Docker Desktop**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Download "Docker Desktop for Windows"

2. **Install Docker Desktop**
   - Run the installer
   - Enable "Use WSL 2 instead of Hyper-V" during installation
   - Restart when prompted

3. **Enable WSL Integration**
   - Open Docker Desktop
   - Go to Settings → Resources → WSL Integration
   - Enable integration with your WSL distribution (Ubuntu)
   - Click "Apply & Restart"

4. **Verify Installation**
   ```bash
   docker --version
   docker run hello-world
   ```

### Option 2: Docker Engine in WSL (Advanced)

If you prefer installing Docker directly in WSL:

1. **Open WSL with elevated privileges**
   ```bash
   # In PowerShell as Administrator:
   wsl -d Ubuntu
   ```

2. **Install Docker Engine**
   ```bash
   # Update packages
   sudo apt update
   sudo apt install -y ca-certificates curl gnupg

   # Add Docker's official GPG key
   sudo install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   sudo chmod a+r /etc/apt/keyrings/docker.gpg

   # Add repository
   echo \
     "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
     sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

   # Add user to docker group
   sudo usermod -aG docker $USER

   # Start Docker service
   sudo service docker start
   ```

3. **Configure Docker to start automatically**
   ```bash
   # Add to ~/.bashrc or ~/.profile
   echo 'sudo service docker start' >> ~/.bashrc
   ```

## After Docker Installation

Once Docker is installed and running:

1. **Test Docker**
   ```bash
   docker --version
   docker info
   ```

2. **Pull Mermaid CLI Image**
   ```bash
   docker pull minlag/mermaid-cli
   ```

3. **Test CodeMarque Mermaid Generation**
   ```bash
   cd /home/cody/projects/CodeMarque
   npm run test:mermaid
   ```

4. **Expected Output**
   ```
   ✅ Docker installed: Docker version 24.x.x
   ✅ Mermaid CLI image: AVAILABLE
   ✅ Success: test_1.png
   📁 Path: /path/to/temp/mermaid-diagrams/test_1.png
   ```

## What This Enables

Once Docker is running, users of your CodeMarque bot will automatically get:

- **Visual Mermaid diagrams** as PNG attachments
- **No setup required** on their end
- **Instant diagram generation** from natural language requests

## Troubleshooting

### Common Issues:

1. **"Cannot connect to Docker daemon"**
   - Solution: `sudo service docker start`

2. **"Permission denied"**
   - Solution: `sudo usermod -aG docker $USER` then logout/login

3. **"WSL 2 required"**
   - Solution: Update to WSL 2 in PowerShell: `wsl --set-version Ubuntu 2`

### Test Commands:
```bash
# Basic Docker test
docker run hello-world

# Mermaid CLI test
docker run --rm minlag/mermaid-cli --help

# CodeMarque integration test
npm run test:mermaid
```

## Current Status Without Docker

Right now, the bot works perfectly with fallback mode:
- ✅ Detects Mermaid code blocks automatically
- ✅ Provides helpful fallback messages
- ✅ Directs users to https://mermaid.live
- ⚠️ No automatic PNG generation (requires Docker)

Once Docker is installed, PNG generation will work automatically!