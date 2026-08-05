#!/bin/bash
# Run on the deployment server to prepare it for IDP Platform

set -e

echo "=== IDP Platform Server Setup ==="

# Install Docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "✅ Docker installed"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo apt-get update -qq
  sudo apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
fi

# Log in to GHCR
echo "Logging in to GitHub Container Registry..."
echo "Run: echo <your-github-token> | docker login ghcr.io -u <username> --password-stdin"

# Create IDP directory
mkdir -p ~/IDP
cd ~/IDP

# Create .env file template
if [ ! -f .env ]; then
cat > .env << 'EOF'
# Production secrets — fill in real values
GROQ_API_KEY=gsk_your_production_key_here
GITHUB_TOKEN=ghp_your_github_pat_here

# These will be set by the CD pipeline:
REGISTRY=ghcr.io/sourabhbarwal
IMAGE_TAG=latest
EOF
  echo "✅ Created .env template at ~/IDP/.env"
  echo "⚠️  Edit .env with real values before first deployment"
fi

echo ""
echo "=== Server setup complete ==="
echo ""
echo "Copy docker-compose.prod.yml to this server:"
echo "  scp docker-compose.prod.yml user@$(hostname):~/IDP/"
echo ""
echo "Then trigger your first deployment from GitHub Actions."