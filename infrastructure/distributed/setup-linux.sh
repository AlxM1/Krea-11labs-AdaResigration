#!/bin/bash
# ============================================
# 11labs + Krya - Linux VM Setup Script
# Run this on your Linux VM that will host the web apps
# ============================================

set -e

echo "=========================================="
echo " 11labs + Krya Unified Setup"
echo " Linux VM Configuration"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Note: Some operations may require sudo${NC}"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "Project root: $PROJECT_ROOT"
echo "Infrastructure dir: $SCRIPT_DIR"
echo ""

# ============================================
# Step 1: Check Prerequisites
# ============================================
echo -e "${GREEN}Step 1: Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}Please log out and back in for Docker permissions to take effect${NC}"
fi
echo "  Docker: $(docker --version)"

# Check Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose not found. Please install Docker Compose v2${NC}"
    exit 1
fi
echo "  Docker Compose: $(docker compose version)"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y git
fi
echo "  Git: $(git --version)"

echo ""

# ============================================
# Step 2: Configure Environment
# ============================================
echo -e "${GREEN}Step 2: Configuring environment...${NC}"

ENV_FILE="$SCRIPT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file from template..."
    cp "$SCRIPT_DIR/.env.example" "$ENV_FILE"

    # Get this machine's IP
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo -e "${YELLOW}Please configure your .env file:${NC}"
    echo "  - HOST_IP: This Linux VM's IP (detected: $LOCAL_IP)"
    echo "  - WINDOWS_GPU_HOST: Your Windows PC's IP"
    echo "  - Update passwords for security"
    echo ""
    echo "Edit the file: nano $ENV_FILE"
    echo ""
    read -p "Press Enter after you've configured .env, or Ctrl+C to exit..."
else
    echo "  .env file already exists"
fi

# Source environment
set -a
source "$ENV_FILE"
set +a

echo ""

# ============================================
# Step 3: Create Required Directories
# ============================================
echo -e "${GREEN}Step 3: Creating directories...${NC}"

mkdir -p "$SCRIPT_DIR/nginx/ssl"
mkdir -p "$SCRIPT_DIR/data/postgres"
mkdir -p "$SCRIPT_DIR/data/redis"
mkdir -p "$SCRIPT_DIR/data/minio"

echo "  Created data directories"
echo ""

# ============================================
# Step 4: Pull Docker Images
# ============================================
echo -e "${GREEN}Step 4: Pulling Docker images...${NC}"

docker pull postgres:16-alpine
docker pull redis:7-alpine
docker pull minio/minio:latest
docker pull nginx:alpine

echo ""

# ============================================
# Step 5: Build Application Images
# ============================================
echo -e "${GREEN}Step 5: Building application images...${NC}"

# Build 11labs
if [ -d "$PROJECT_ROOT/elevenlabs" ]; then
    echo "  Building 11labs backend..."
    # Check if Dockerfile exists
    if [ -f "$PROJECT_ROOT/elevenlabs/docker/Dockerfile.backend" ]; then
        docker build -t elevenlabs-backend -f "$PROJECT_ROOT/elevenlabs/docker/Dockerfile.backend" "$PROJECT_ROOT/elevenlabs" || {
            echo -e "${YELLOW}  11labs backend build skipped (Dockerfile may need configuration)${NC}"
        }
    else
        echo -e "${YELLOW}  11labs Dockerfile not found, skipping build${NC}"
    fi

    echo "  Building 11labs frontend..."
    if [ -f "$PROJECT_ROOT/elevenlabs/docker/Dockerfile.frontend" ]; then
        docker build -t elevenlabs-frontend -f "$PROJECT_ROOT/elevenlabs/docker/Dockerfile.frontend" "$PROJECT_ROOT/elevenlabs" || {
            echo -e "${YELLOW}  11labs frontend build skipped${NC}"
        }
    fi
fi

# Note about Krya (it's in a different branch)
echo ""
echo -e "${YELLOW}Note: Krya is in a separate branch (claude/krea-ai-clone-DJQQv)${NC}"
echo "  To include Krya, merge or checkout that branch first"
echo ""

# ============================================
# Step 6: Start Infrastructure Services
# ============================================
echo -e "${GREEN}Step 6: Starting infrastructure services...${NC}"

cd "$SCRIPT_DIR"

# Start only infrastructure services first
docker compose -f docker-compose.unified.yml up -d postgres redis minio minio-init

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "Service Status:"
docker compose -f docker-compose.unified.yml ps

echo ""

# ============================================
# Step 7: Test Connectivity
# ============================================
echo -e "${GREEN}Step 7: Testing connectivity...${NC}"

# Test PostgreSQL
if docker compose -f docker-compose.unified.yml exec -T postgres pg_isready -U ${POSTGRES_USER:-admin} > /dev/null 2>&1; then
    echo -e "  PostgreSQL: ${GREEN}OK${NC}"
else
    echo -e "  PostgreSQL: ${RED}FAILED${NC}"
fi

# Test Redis
if docker compose -f docker-compose.unified.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "  Redis: ${GREEN}OK${NC}"
else
    echo -e "  Redis: ${RED}FAILED${NC}"
fi

# Test MinIO
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live | grep -q "200"; then
    echo -e "  MinIO: ${GREEN}OK${NC}"
else
    echo -e "  MinIO: ${YELLOW}Starting...${NC}"
fi

# Test Windows GPU Worker
if [ -n "$WINDOWS_GPU_HOST" ]; then
    if curl -s -o /dev/null -w "%{http_code}" "http://${WINDOWS_GPU_HOST}:8001/health" 2>/dev/null | grep -q "200"; then
        echo -e "  Windows GPU Worker: ${GREEN}OK${NC}"
    else
        echo -e "  Windows GPU Worker: ${YELLOW}NOT RUNNING${NC}"
        echo "    Start it on Windows: ./start_all_gpu_services.ps1"
    fi
fi

echo ""

# ============================================
# Summary
# ============================================
echo "=========================================="
echo -e "${GREEN} Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Infrastructure Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - MinIO Console: http://localhost:9001"
echo ""
echo "Next Steps:"
echo ""
echo "1. Start GPU services on Windows PC:"
echo "   cd infrastructure/distributed/gpu-worker"
echo "   ./start_all_gpu_services.ps1"
echo ""
echo "2. Start application services:"
echo "   cd $SCRIPT_DIR"
echo "   docker compose -f docker-compose.unified.yml up -d elevenlabs-api elevenlabs-frontend"
echo ""
echo "3. Access the applications:"
echo "   - 11labs: http://localhost:3000"
echo "   - Krya: http://localhost:3001 (when enabled)"
echo "   - MinIO: http://localhost:9001"
echo ""
echo "4. View logs:"
echo "   docker compose -f docker-compose.unified.yml logs -f"
echo ""
