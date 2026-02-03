# VoiceForge + Krya GPU Services - Windows PowerShell Script
# Starts all GPU services for the integrated AI platform

param(
    [switch]$VoiceOnly,
    [switch]$ImageOnly,
    [switch]$NoOllama,
    [string]$ComfyUIPath = "$env:USERPROFILE\ComfyUI",
    [string]$OllamaPath = "$env:LOCALAPPDATA\Programs\Ollama"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Unified AI GPU Services Launcher" -ForegroundColor Cyan
Write-Host " VoiceForge + Krya" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Get this PC's IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
Write-Host "This PC's IP: $localIP" -ForegroundColor Green
Write-Host ""

# Check NVIDIA GPU
$gpuInfo = & nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "GPU Detected:" -ForegroundColor Green
    Write-Host $gpuInfo
    Write-Host ""
} else {
    Write-Host "WARNING: NVIDIA GPU not detected!" -ForegroundColor Yellow
}

# Function to start a service in a new terminal
function Start-ServiceInNewTerminal {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir,
        [string]$Color = "White"
    )

    Write-Host "Starting $Name..." -ForegroundColor $Color

    $process = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k", "title $Name && cd /d `"$WorkingDir`" && $Command" `
        -PassThru

    return $process
}

$processes = @()

# ============================================
# Start Ollama (LLM Server)
# ============================================
if (-not $NoOllama -and -not $VoiceOnly) {
    $ollamaExe = Join-Path $OllamaPath "ollama.exe"
    if (Test-Path $ollamaExe) {
        Write-Host "Starting Ollama LLM Server..." -ForegroundColor Magenta
        $env:OLLAMA_HOST = "0.0.0.0:11434"
        $processes += Start-Process -FilePath $ollamaExe -ArgumentList "serve" -PassThru
        Write-Host "  Ollama: http://${localIP}:11434" -ForegroundColor Gray
    } else {
        Write-Host "Ollama not found at $ollamaExe" -ForegroundColor Yellow
        Write-Host "  Install from: https://ollama.ai" -ForegroundColor Gray
    }
}

# ============================================
# Start ComfyUI (Image/Video Generation)
# ============================================
if (-not $VoiceOnly) {
    $comfyMain = Join-Path $ComfyUIPath "main.py"
    if (Test-Path $comfyMain) {
        $processes += Start-ServiceInNewTerminal `
            -Name "ComfyUI" `
            -Command "python main.py --listen 0.0.0.0 --port 8188" `
            -WorkingDir $ComfyUIPath `
            -Color "Blue"
        Write-Host "  ComfyUI: http://${localIP}:8188" -ForegroundColor Gray
    } else {
        Write-Host "ComfyUI not found at $ComfyUIPath" -ForegroundColor Yellow
        Write-Host "  Clone from: https://github.com/comfyanonymous/ComfyUI" -ForegroundColor Gray
    }
}

# ============================================
# Start VoiceForge GPU Worker
# ============================================
if (-not $ImageOnly) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $voiceWorker = Join-Path $scriptDir "voice_worker.py"

    if (Test-Path $voiceWorker) {
        # Ensure virtual environment exists
        $venvPath = Join-Path $scriptDir "venv"
        if (-not (Test-Path $venvPath)) {
            Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
            & python -m venv $venvPath
            & "$venvPath\Scripts\pip.exe" install -r (Join-Path $scriptDir "requirements.txt")
        }

        $processes += Start-ServiceInNewTerminal `
            -Name "VoiceForge GPU Worker" `
            -Command "`"$venvPath\Scripts\python.exe`" voice_worker.py" `
            -WorkingDir $scriptDir `
            -Color "Green"
        Write-Host "  VoiceForge: http://${localIP}:8001" -ForegroundColor Gray
    } else {
        Write-Host "Voice worker not found at $voiceWorker" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " All GPU services started!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configure your Linux VM with these URLs:" -ForegroundColor Yellow
Write-Host "  WINDOWS_GPU_HOST=$localIP" -ForegroundColor White
Write-Host "  COMFYUI_URL=http://${localIP}:8188" -ForegroundColor White
Write-Host "  OLLAMA_URL=http://${localIP}:11434" -ForegroundColor White
Write-Host "  GPU_WORKER_URL=http://${localIP}:8001" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring (services will continue running)" -ForegroundColor Gray
Write-Host ""

# Monitor services
try {
    while ($true) {
        Start-Sleep -Seconds 30

        # Health check
        $voiceHealth = try { (Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 5 -UseBasicParsing).StatusCode } catch { "OFFLINE" }
        $comfyHealth = try { (Invoke-WebRequest -Uri "http://localhost:8188/system_stats" -TimeoutSec 5 -UseBasicParsing).StatusCode } catch { "OFFLINE" }
        $ollamaHealth = try { (Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 5 -UseBasicParsing).StatusCode } catch { "OFFLINE" }

        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Health: Voice=$voiceHealth, ComfyUI=$comfyHealth, Ollama=$ollamaHealth" -ForegroundColor Gray
    }
}
catch {
    Write-Host "Monitoring stopped" -ForegroundColor Yellow
}
