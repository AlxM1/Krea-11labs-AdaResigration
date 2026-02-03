#!/bin/bash

# ===========================================
# Krya Development Runner
# Starts all services and the Next.js dev server
# ===========================================

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Starting Docker services...${NC}"
docker compose up -d db redis

echo -e "${YELLOW}Waiting for services...${NC}"
sleep 3

echo -e "${GREEN}Starting development server...${NC}"
pnpm dev
