#!/bin/bash
# ===========================================
# Krya Network Connectivity Test
# ===========================================
# Test connectivity between Linux VM and Windows GPU Worker
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
print_fail() { echo -e "${RED}[FAIL]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# Get GPU worker IP from .env or argument
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [[ -n "$1" ]]; then
    GPU_WORKER_IP="$1"
elif [[ -f "$ENV_FILE" ]]; then
    GPU_WORKER_IP=$(grep "^GPU_WORKER_IP=" "$ENV_FILE" | cut -d'=' -f2)
else
    echo "Usage: $0 <gpu-worker-ip>"
    echo "Or create .env file with GPU_WORKER_IP"
    exit 1
fi

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Krya Network Connectivity Test         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "GPU Worker IP: ${YELLOW}${GPU_WORKER_IP}${NC}"
echo ""

ERRORS=0

# ===========================================
# Test 1: Basic Network Connectivity
# ===========================================
echo -e "${CYAN}[Test 1] Basic Network Connectivity${NC}"
echo -n "  Ping test... "
if ping -c 1 -W 2 "$GPU_WORKER_IP" > /dev/null 2>&1; then
    print_ok "Host is reachable"
else
    print_fail "Cannot reach host (ping failed)"
    print_info "Check if Windows Firewall allows ICMP"
    ((ERRORS++))
fi

# ===========================================
# Test 2: ComfyUI Port
# ===========================================
echo ""
echo -e "${CYAN}[Test 2] ComfyUI (Port 8188)${NC}"

echo -n "  Port check... "
if timeout 3 bash -c "echo > /dev/tcp/${GPU_WORKER_IP}/8188" 2>/dev/null; then
    print_ok "Port 8188 is open"
else
    print_fail "Port 8188 is closed or blocked"
    print_info "Run setup-gpu-worker.ps1 -ConfigureFirewall on Windows"
    ((ERRORS++))
fi

echo -n "  HTTP check... "
COMFYUI_RESPONSE=$(curl -sf --max-time 5 "http://${GPU_WORKER_IP}:8188/system_stats" 2>&1) && {
    print_ok "ComfyUI API is responding"

    # Parse some stats if available
    if command -v jq &> /dev/null; then
        VRAM=$(echo "$COMFYUI_RESPONSE" | jq -r '.devices[0].vram_total // "unknown"' 2>/dev/null)
        if [[ "$VRAM" != "unknown" && "$VRAM" != "null" ]]; then
            VRAM_GB=$(echo "scale=1; $VRAM / 1073741824" | bc 2>/dev/null || echo "?")
            print_info "GPU VRAM: ${VRAM_GB}GB"
        fi
    fi
} || {
    print_fail "ComfyUI is not responding"
    print_info "Start ComfyUI on Windows: Start-ComfyUI.bat"
    ((ERRORS++))
}

echo -n "  Models check... "
MODELS_RESPONSE=$(curl -sf --max-time 5 "http://${GPU_WORKER_IP}:8188/object_info/CheckpointLoaderSimple" 2>&1) && {
    if command -v jq &> /dev/null; then
        MODEL_COUNT=$(echo "$MODELS_RESPONSE" | jq -r '.CheckpointLoaderSimple.input.required.ckpt_name[0] | length' 2>/dev/null || echo "0")
        if [[ "$MODEL_COUNT" -gt 0 ]]; then
            print_ok "Found $MODEL_COUNT checkpoint model(s)"
        else
            print_warn "No checkpoint models found"
            print_info "Add models to C:\\ComfyUI\\models\\checkpoints\\"
        fi
    else
        print_ok "Models endpoint accessible"
    fi
} || {
    print_warn "Could not check models"
}

# ===========================================
# Test 3: Ollama Port
# ===========================================
echo ""
echo -e "${CYAN}[Test 3] Ollama (Port 11434)${NC}"

echo -n "  Port check... "
if timeout 3 bash -c "echo > /dev/tcp/${GPU_WORKER_IP}/11434" 2>/dev/null; then
    print_ok "Port 11434 is open"
else
    print_fail "Port 11434 is closed or blocked"
    print_info "Run setup-gpu-worker.ps1 -ConfigureFirewall on Windows"
    ((ERRORS++))
fi

echo -n "  HTTP check... "
OLLAMA_RESPONSE=$(curl -sf --max-time 5 "http://${GPU_WORKER_IP}:11434/api/tags" 2>&1) && {
    print_ok "Ollama API is responding"

    # List models if jq is available
    if command -v jq &> /dev/null; then
        MODELS=$(echo "$OLLAMA_RESPONSE" | jq -r '.models[].name' 2>/dev/null)
        if [[ -n "$MODELS" ]]; then
            print_info "Available models:"
            echo "$MODELS" | while read -r model; do
                echo "    - $model"
            done
        else
            print_warn "No models installed"
            print_info "Run: ollama pull llama3.2"
        fi
    fi
} || {
    print_fail "Ollama is not responding"
    print_info "Start Ollama on Windows: Start-Ollama.bat"
    ((ERRORS++))
}

# ===========================================
# Test 4: Image Generation Test
# ===========================================
echo ""
echo -e "${CYAN}[Test 4] Image Generation Test${NC}"

# Check if ComfyUI can actually generate
echo -n "  Queue prompt test... "
QUEUE_RESPONSE=$(curl -sf --max-time 5 "http://${GPU_WORKER_IP}:8188/prompt" -X POST \
    -H "Content-Type: application/json" \
    -d '{"prompt": {}, "client_id": "test"}' 2>&1)

if [[ $? -eq 0 ]]; then
    print_ok "ComfyUI queue is accepting prompts"
else
    print_warn "Could not test prompt queue"
fi

# ===========================================
# Test 5: LLM Generation Test
# ===========================================
echo ""
echo -e "${CYAN}[Test 5] LLM Generation Test${NC}"

echo -n "  Generate test... "
LLM_RESPONSE=$(curl -sf --max-time 30 "http://${GPU_WORKER_IP}:11434/api/generate" \
    -d '{"model": "llama3.2", "prompt": "Say hello in 5 words or less", "stream": false}' 2>&1)

if [[ $? -eq 0 ]]; then
    if command -v jq &> /dev/null; then
        RESPONSE_TEXT=$(echo "$LLM_RESPONSE" | jq -r '.response' 2>/dev/null | head -c 50)
        print_ok "LLM responded: \"${RESPONSE_TEXT}...\""
    else
        print_ok "LLM is generating responses"
    fi
else
    print_warn "LLM test failed (model might not be installed)"
    print_info "Run: ollama pull llama3.2"
fi

# ===========================================
# Summary
# ===========================================
echo ""
echo -e "${CYAN}════════════════════════════════════════════${NC}"

if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC} Your GPU worker is ready."
    echo ""
    echo "You can now start Krya:"
    echo "  ./start.sh"
else
    echo -e "${RED}$ERRORS test(s) failed.${NC}"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. On Windows, run setup-gpu-worker.ps1 as Administrator"
    echo "2. Start GPU services: Double-click 'Krya GPU Worker' on desktop"
    echo "3. Check Windows Firewall settings"
    echo "4. Ensure both machines are on the same network"
fi
echo ""
