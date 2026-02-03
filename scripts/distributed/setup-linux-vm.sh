#!/bin/bash
# ===========================================
# Krya Linux VM Setup Script
# ===========================================
# Run this on your Linux VM to set up the web application
# that connects to your Windows GPU worker
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${CYAN}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Banner
echo -e "${CYAN}"
cat << "EOF"
 _  __                    _     _                  __     ____  __
| |/ /_ __ _   _  __ _   | |   (_)_ __  _   ___  _\ \   / /  \/  |
| ' /| '__| | | |/ _` |  | |   | | '_ \| | | \ \/ /\ \ / /| |\/| |
| . \| |  | |_| | (_| |  | |___| | | | | |_| |>  <  \ V / | |  | |
|_|\_\_|   \__, |\__,_|  |_____|_|_| |_|\__,_/_/\_\  \_/  |_|  |_|
           |___/
EOF
echo -e "${NC}"
echo "Linux VM Setup for Distributed GPU Inference"
echo ""

# ===========================================
# Check Prerequisites
# ===========================================
print_header "Checking Prerequisites"

# Check Docker
if command -v docker &> /dev/null; then
    print_success "Docker is installed"
else
    print_error "Docker is not installed"
    print_info "Install Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose is installed"
else
    print_error "Docker Compose is not installed"
    print_info "Install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if running as root or with docker permissions
if docker ps &> /dev/null; then
    print_success "Docker permissions OK"
else
    print_error "Cannot access Docker. Run with sudo or add user to docker group"
    exit 1
fi

# ===========================================
# Get GPU Worker IP
# ===========================================
print_header "GPU Worker Configuration"

# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "Your Linux VM IP: $LOCAL_IP"
echo ""

# Ask for GPU worker IP
read -p "Enter your Windows GPU Worker IP address: " GPU_WORKER_IP

if [[ -z "$GPU_WORKER_IP" ]]; then
    print_error "GPU Worker IP is required"
    exit 1
fi

# Validate IP format
if [[ ! $GPU_WORKER_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Invalid IP address format"
    exit 1
fi

print_info "GPU Worker IP: $GPU_WORKER_IP"

# ===========================================
# Test GPU Worker Connectivity
# ===========================================
print_header "Testing GPU Worker Connectivity"

# Test ComfyUI
echo -n "Testing ComfyUI (${GPU_WORKER_IP}:8188)... "
if curl -sf "http://${GPU_WORKER_IP}:8188/system_stats" > /dev/null 2>&1; then
    print_success "ComfyUI is reachable"
    COMFYUI_AVAILABLE=true
else
    print_warning "ComfyUI is not reachable (will retry after setup)"
    COMFYUI_AVAILABLE=false
fi

# Test Ollama
echo -n "Testing Ollama (${GPU_WORKER_IP}:11434)... "
if curl -sf "http://${GPU_WORKER_IP}:11434/api/tags" > /dev/null 2>&1; then
    print_success "Ollama is reachable"
    OLLAMA_AVAILABLE=true
else
    print_warning "Ollama is not reachable (will retry after setup)"
    OLLAMA_AVAILABLE=false
fi

if [[ "$COMFYUI_AVAILABLE" == "false" && "$OLLAMA_AVAILABLE" == "false" ]]; then
    echo ""
    print_warning "Neither ComfyUI nor Ollama is reachable."
    print_info "Make sure you've run setup-gpu-worker.ps1 on your Windows PC"
    print_info "and started the services (double-click 'Krya GPU Worker' on desktop)"
    echo ""
    read -p "Continue anyway? [y/N] " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ===========================================
# Create Environment File
# ===========================================
print_header "Creating Environment Configuration"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

# Generate secrets
AUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
MINIO_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

cat > "$ENV_FILE" << EOF
# ===========================================
# Krya Distributed Setup - Generated Configuration
# Generated on: $(date)
# ===========================================

# GPU Worker Configuration
GPU_WORKER_IP=${GPU_WORKER_IP}
COMFYUI_URL=http://${GPU_WORKER_IP}:8188
COMFYUI_OUTPUT_URL=http://${GPU_WORKER_IP}:8188/view
OLLAMA_URL=http://${GPU_WORKER_IP}:11434

# Database
POSTGRES_USER=krya
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=krya
DATABASE_URL=postgresql://krya:${POSTGRES_PASSWORD}@postgres:5432/krya

# Authentication
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=http://${LOCAL_IP}:3000

# Storage (MinIO)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=${MINIO_PASSWORD}
S3_BUCKET=krya-uploads

# Default to local GPU
DEFAULT_PROVIDER_MODE=local
DEFAULT_IMAGE_PROVIDER=comfyui
DEFAULT_LLM_PROVIDER=ollama

# Cloud Providers (add your keys if needed)
FAL_KEY=
REPLICATE_API_TOKEN=
GOOGLE_AI_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
EOF

print_success "Environment file created: $ENV_FILE"

# ===========================================
# Create Nginx Configuration
# ===========================================
print_header "Creating Nginx Configuration"

cat > "${SCRIPT_DIR}/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream web {
        server web:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=generate:10m rate=1r/s;

    server {
        listen 80;
        server_name _;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
        gzip_min_length 1000;

        # API routes with rate limiting
        location /api/generate {
            limit_req zone=generate burst=5 nodelay;
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
        }

        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files and app
        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Health check endpoint (no rate limit)
        location /api/health {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
EOF

print_success "Nginx configuration created"

# ===========================================
# Create SSL directory
# ===========================================
mkdir -p "${SCRIPT_DIR}/ssl"
print_info "SSL directory created (add certificates for HTTPS)"

# ===========================================
# Summary
# ===========================================
print_header "Setup Complete!"

echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Linux VM IP:        ${CYAN}${LOCAL_IP}${NC}"
echo -e "GPU Worker IP:      ${CYAN}${GPU_WORKER_IP}${NC}"
echo -e "ComfyUI URL:        ${CYAN}http://${GPU_WORKER_IP}:8188${NC}"
echo -e "Ollama URL:         ${CYAN}http://${GPU_WORKER_IP}:11434${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Make sure GPU Worker is running on Windows:"
echo "   - Double-click 'Krya GPU Worker' on your Windows desktop"
echo ""
echo "2. Start the application:"
echo "   cd ${SCRIPT_DIR}"
echo "   docker compose -f docker-compose.distributed.yml up -d"
echo ""
echo "3. Access the application:"
echo "   http://${LOCAL_IP}:3000"
echo ""
echo "4. (Optional) Add cloud API keys to .env for fallback:"
echo "   - FAL_KEY"
echo "   - GOOGLE_AI_API_KEY"
echo ""

# Create a quick start script
cat > "${SCRIPT_DIR}/start.sh" << EOF
#!/bin/bash
cd "${SCRIPT_DIR}"
docker compose -f docker-compose.distributed.yml up -d
echo ""
echo "Krya is starting..."
echo "Access at: http://${LOCAL_IP}:3000"
echo ""
echo "View logs: docker compose -f docker-compose.distributed.yml logs -f"
EOF
chmod +x "${SCRIPT_DIR}/start.sh"

cat > "${SCRIPT_DIR}/stop.sh" << EOF
#!/bin/bash
cd "${SCRIPT_DIR}"
docker compose -f docker-compose.distributed.yml down
echo "Krya stopped."
EOF
chmod +x "${SCRIPT_DIR}/stop.sh"

cat > "${SCRIPT_DIR}/logs.sh" << EOF
#!/bin/bash
cd "${SCRIPT_DIR}"
docker compose -f docker-compose.distributed.yml logs -f
EOF
chmod +x "${SCRIPT_DIR}/logs.sh"

print_success "Created helper scripts: start.sh, stop.sh, logs.sh"
