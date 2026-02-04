#!/bin/bash
# Voice Library Downloader
# Downloads free voices from open source datasets
#
# Usage:
#   ./download_voices.sh              # Show help
#   ./download_voices.sh --all        # Download all datasets
#   ./download_voices.sh --quick      # Download essential voices only
#   ./download_voices.sh --dataset vctk hifi_tts  # Specific datasets

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/download_voices.py"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           11labs Voice Library Downloader                  ║"
    echo "║       Download 220+ free voices from open datasets        ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON="python3"
    elif command -v python &> /dev/null; then
        PYTHON="python"
    else
        echo -e "${RED}Error: Python not found. Please install Python 3.8+${NC}"
        exit 1
    fi

    # Check Python version
    PY_VERSION=$($PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    echo -e "${GREEN}Using Python $PY_VERSION${NC}"
}

install_dependencies() {
    echo -e "${YELLOW}Installing required packages...${NC}"
    $PYTHON -m pip install --quiet datasets soundfile numpy tqdm requests
    echo -e "${GREEN}Dependencies installed.${NC}"
}

show_help() {
    print_banner
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --all, -a           Download all available datasets"
    echo "  --quick, -q         Download essential voices only (XTTS, LJSpeech, HiFi)"
    echo "  --dataset, -d       Download specific dataset(s)"
    echo "  --list, -l          List all available datasets"
    echo "  --status, -s        Show download status"
    echo "  --force, -f         Force re-download"
    echo "  --install-deps      Install Python dependencies"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Available datasets:"
    echo "  vctk         - VCTK Corpus (110 English speakers with accents)"
    echo "  hifi_tts     - Hi-Fi TTS (10 studio quality speakers)"
    echo "  ljspeech     - LJSpeech (1 high-quality female speaker)"
    echo "  libritts     - LibriTTS (Large English audiobook corpus)"
    echo "  common_voice - Mozilla Common Voice (Crowdsourced multilingual)"
    echo "  speecht5     - SpeechT5 speaker embeddings"
    echo ""
    echo "Examples:"
    echo "  $0 --quick                  # Download essential voices"
    echo "  $0 --dataset vctk hifi_tts  # Download specific datasets"
    echo "  $0 --all                    # Download everything"
    echo "  $0 --status                 # Check what's downloaded"
}

# Parse arguments
ARGS=""
QUICK_MODE=false

for arg in "$@"; do
    case $arg in
        --help|-h)
            show_help
            exit 0
            ;;
        --install-deps)
            check_python
            install_dependencies
            exit 0
            ;;
        --quick|-q)
            QUICK_MODE=true
            ;;
        *)
            ARGS="$ARGS $arg"
            ;;
    esac
done

# Main execution
print_banner
check_python

# Check if script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo -e "${RED}Error: Python script not found at $PYTHON_SCRIPT${NC}"
    exit 1
fi

# Quick mode downloads only essential voices
if [ "$QUICK_MODE" = true ]; then
    echo -e "${YELLOW}Quick mode: Downloading essential voices...${NC}"
    echo ""
    $PYTHON "$PYTHON_SCRIPT" --dataset ljspeech hifi_tts
    exit 0
fi

# If no arguments, show help
if [ -z "$ARGS" ]; then
    show_help
    exit 0
fi

# Run the Python script with arguments
$PYTHON "$PYTHON_SCRIPT" $ARGS
