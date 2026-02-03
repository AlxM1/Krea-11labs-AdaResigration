#!/bin/bash

# ===========================================
# Krya Development Setup Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║         Krya Development Setup            ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}✗ $1 is not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✓ $1 is installed${NC}"
        return 0
    fi
}

MISSING_DEPS=0
check_command "docker" || MISSING_DEPS=1
check_command "node" || MISSING_DEPS=1
check_command "pnpm" || { echo -e "${YELLOW}  Installing pnpm...${NC}"; npm install -g pnpm; }

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies and run again.${NC}"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"

# Check for .env file
echo ""
echo -e "${YELLOW}Checking environment configuration...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    # Generate a new AUTH_SECRET
    NEW_SECRET=$(openssl rand -base64 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|AUTH_SECRET=\".*\"|AUTH_SECRET=\"$NEW_SECRET\"|" .env
    else
        sed -i "s|AUTH_SECRET=\".*\"|AUTH_SECRET=\"$NEW_SECRET\"|" .env
    fi
    echo -e "${GREEN}✓ Created .env with new AUTH_SECRET${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Start Docker services
echo ""
echo -e "${YELLOW}Starting Docker services (PostgreSQL + Redis)...${NC}"
docker compose up -d db redis

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Check if services are running
if docker compose ps | grep -q "krya-db.*healthy\|krya-db.*running"; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL failed to start. Check: docker compose logs db${NC}"
    exit 1
fi

if docker compose ps | grep -q "krya-redis.*healthy\|krya-redis.*running"; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis failed to start. Check: docker compose logs redis${NC}"
    exit 1
fi

# Install dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install

# Generate Prisma client
echo ""
echo -e "${YELLOW}Generating Prisma client...${NC}"
cd apps/web
pnpm prisma generate

# Run database migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
pnpm prisma migrate dev --name init 2>/dev/null || pnpm prisma migrate deploy

cd "$PROJECT_ROOT"

# Success message
echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════╗"
echo "║          Setup Complete! 🎉               ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "  1. Configure API keys in .env:"
echo "     - FAL_KEY (https://fal.ai/dashboard/keys)"
echo "     - REPLICATE_API_TOKEN (https://replicate.com/account)"
echo "     - OPENAI_API_KEY (https://platform.openai.com/api-keys)"
echo ""
echo "  2. Start the development server:"
echo "     ${GREEN}pnpm dev${NC}"
echo ""
echo "  3. Open http://localhost:3000"
echo ""
echo -e "${YELLOW}Optional services:${NC}"
echo "  - Start MinIO (local S3): docker compose --profile storage up -d"
echo "  - Start admin tools:      docker compose --profile tools up -d"
echo "    - pgAdmin:              http://localhost:5050"
echo "    - Redis Commander:      http://localhost:8081"
echo ""
