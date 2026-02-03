# ============================================
# VoiceForge + Krya - Windows GPU Setup Script
# Run this on your Windows PC with RTX 5090
# ============================================

param(
    [string]$ComfyUIPath = "$env:USERPROFILE\ComfyUI",
    [string]$OllamaPath = "$env:LOCALAPPDATA\Programs\Ollama",
    [switch]$SkipComfyUI,
    [switch]$SkipOllama,
    [switch]$SkipVoiceWorker
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " VoiceForge + Krya GPU Setup" -ForegroundColor Cyan
Write-Host " Windows PC Configuration" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GpuWorkerDir = Join-Path $ScriptDir "gpu-worker"

# ============================================
# Step 1: Check Prerequisites
# ============================================
Write-Host "Step 1: Checking prerequisites..." -ForegroundColor Green

# Check NVIDIA GPU
Write-Host "  Checking NVIDIA GPU..."
$gpuInfo = & nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  GPU Found: $gpuInfo" -ForegroundColor Green
} else {
    Write-Host "  WARNING: NVIDIA GPU not detected!" -ForegroundColor Yellow
    Write-Host "  Voice AI will run on CPU (much slower)" -ForegroundColor Yellow
}

# Check CUDA
$cudaPath = $env:CUDA_PATH
if ($cudaPath -and (Test-Path $cudaPath)) {
    Write-Host "  CUDA: $cudaPath" -ForegroundColor Green
} else {
    Write-Host "  WARNING: CUDA not found" -ForegroundColor Yellow
    Write-Host "  Install CUDA Toolkit from: https://developer.nvidia.com/cuda-downloads" -ForegroundColor Gray
}

# Check Python
Write-Host "  Checking Python..."
$pythonVersion = & python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Python not found!" -ForegroundColor Red
    Write-Host "  Install Python 3.10+ from: https://python.org" -ForegroundColor Gray
    exit 1
}

# Check pip
& pip --version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pip not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================
# Step 2: Install/Update Ollama
# ============================================
if (-not $SkipOllama) {
    Write-Host "Step 2: Setting up Ollama (LLM Server)..." -ForegroundColor Green

    $ollamaExe = Join-Path $OllamaPath "ollama.exe"
    if (Test-Path $ollamaExe) {
        Write-Host "  Ollama found at: $ollamaExe" -ForegroundColor Green
    } else {
        Write-Host "  Ollama not found. Please install from: https://ollama.ai" -ForegroundColor Yellow
        Write-Host "  Or run: winget install Ollama.Ollama" -ForegroundColor Gray
    }

    # Pull recommended models
    if (Test-Path $ollamaExe) {
        Write-Host "  Pulling recommended LLM models..."

        # LLaMA 3.1 8B for general use
        Write-Host "    Pulling llama3.1:8b..." -ForegroundColor Gray
        & $ollamaExe pull llama3.1:8b

        # Mistral for faster responses
        Write-Host "    Pulling mistral:7b..." -ForegroundColor Gray
        & $ollamaExe pull mistral:7b

        Write-Host "  Ollama models ready!" -ForegroundColor Green
    }
} else {
    Write-Host "Step 2: Skipping Ollama setup" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 3: Install/Update ComfyUI
# ============================================
if (-not $SkipComfyUI) {
    Write-Host "Step 3: Setting up ComfyUI (Image/Video Generation)..." -ForegroundColor Green

    if (Test-Path $ComfyUIPath) {
        Write-Host "  ComfyUI found at: $ComfyUIPath" -ForegroundColor Green

        # Update ComfyUI
        Write-Host "  Updating ComfyUI..."
        Push-Location $ComfyUIPath
        & git pull 2>$null
        Pop-Location
    } else {
        Write-Host "  ComfyUI not found. Installing..."
        Write-Host "  Cloning to: $ComfyUIPath" -ForegroundColor Gray

        & git clone https://github.com/comfyanonymous/ComfyUI.git $ComfyUIPath

        # Install ComfyUI dependencies
        Write-Host "  Installing ComfyUI dependencies..."
        Push-Location $ComfyUIPath
        & pip install -r requirements.txt
        Pop-Location

        Write-Host "  ComfyUI installed!" -ForegroundColor Green
    }

    # Install ComfyUI Manager (for easy model management)
    $comfyManagerPath = Join-Path $ComfyUIPath "custom_nodes\ComfyUI-Manager"
    if (-not (Test-Path $comfyManagerPath)) {
        Write-Host "  Installing ComfyUI Manager..."
        & git clone https://github.com/ltdrdata/ComfyUI-Manager.git $comfyManagerPath
    }
} else {
    Write-Host "Step 3: Skipping ComfyUI setup" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 4: Setup VoiceForge GPU Worker
# ============================================
if (-not $SkipVoiceWorker) {
    Write-Host "Step 4: Setting up VoiceForge GPU Worker..." -ForegroundColor Green

    if (-not (Test-Path $GpuWorkerDir)) {
        Write-Host "  ERROR: GPU worker directory not found: $GpuWorkerDir" -ForegroundColor Red
        exit 1
    }

    # Create virtual environment
    $venvPath = Join-Path $GpuWorkerDir "venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "  Creating Python virtual environment..."
        Push-Location $GpuWorkerDir
        & python -m venv venv
        Pop-Location
    }

    # Activate and install dependencies
    Write-Host "  Installing VoiceForge dependencies..."
    Write-Host "  This may take 10-20 minutes for first-time setup..." -ForegroundColor Yellow
    $pipExe = Join-Path $venvPath "Scripts\pip.exe"

    # Install PyTorch with CUDA support first
    Write-Host "  Installing PyTorch with CUDA support..."
    & $pipExe install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

    # Install remaining dependencies
    Write-Host "  Installing voice AI dependencies..."
    $requirementsPath = Join-Path $GpuWorkerDir "requirements.txt"
    & $pipExe install -r $requirementsPath

    Write-Host "  VoiceForge GPU Worker setup complete!" -ForegroundColor Green
} else {
    Write-Host "Step 4: Skipping VoiceForge GPU Worker setup" -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# Step 5: Configure Firewall
# ============================================
Write-Host "Step 5: Configuring Windows Firewall..." -ForegroundColor Green

$firewallRules = @(
    @{Name="VoiceForge GPU Worker"; Port=8001},
    @{Name="ComfyUI"; Port=8188},
    @{Name="Ollama"; Port=11434}
)

foreach ($rule in $firewallRules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if (-not $existing) {
        Write-Host "  Adding firewall rule: $($rule.Name) (port $($rule.Port))"
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow | Out-Null
    } else {
        Write-Host "  Firewall rule exists: $($rule.Name)"
    }
}

Write-Host ""

# ============================================
# Step 6: Get Network Configuration
# ============================================
Write-Host "Step 6: Network Configuration..." -ForegroundColor Green

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -notlike "*Loopback*" -and
    $_.IPAddress -notlike "169.*" -and
    $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "This PC's IP address: $localIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these to your Linux VM's .env file:" -ForegroundColor Yellow
Write-Host "  WINDOWS_GPU_HOST=$localIP" -ForegroundColor White
Write-Host "  COMFYUI_URL=http://${localIP}:8188" -ForegroundColor White
Write-Host "  OLLAMA_URL=http://${localIP}:11434" -ForegroundColor White
Write-Host "  GPU_WORKER_URL=http://${localIP}:8001" -ForegroundColor White
Write-Host ""

# ============================================
# Summary
# ============================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "GPU Services installed:" -ForegroundColor White
Write-Host "  - VoiceForge GPU Worker (TTS, STT, SFX, Voice Isolation)"
if (-not $SkipComfyUI) {
    Write-Host "  - ComfyUI (Image/Video Generation)"
}
if (-not $SkipOllama) {
    Write-Host "  - Ollama (Local LLM)"
}
Write-Host ""
Write-Host "To start all GPU services, run:" -ForegroundColor Yellow
Write-Host "  cd $GpuWorkerDir" -ForegroundColor White
Write-Host "  .\start_all_gpu_services.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or start individual services:" -ForegroundColor Yellow
Write-Host "  VoiceForge: .\start_worker.bat" -ForegroundColor White
Write-Host "  ComfyUI: python $ComfyUIPath\main.py --listen 0.0.0.0" -ForegroundColor White
Write-Host "  Ollama: ollama serve" -ForegroundColor White
Write-Host ""
