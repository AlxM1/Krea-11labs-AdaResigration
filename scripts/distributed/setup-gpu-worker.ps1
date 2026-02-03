# ===========================================
# Krya GPU Worker Setup Script (Windows)
# ===========================================
# Run this on your Windows PC with the RTX 5090
# This sets up ComfyUI and Ollama to accept network connections
# Installs everything to E: drive with auto-update support
# ===========================================

param(
    [switch]$InstallComfyUI,
    [switch]$InstallOllama,
    [switch]$DownloadModels,
    [switch]$ConfigureFirewall,
    [switch]$CreateStartupScripts,
    [switch]$UpdateModels,
    [switch]$CheckUpdates,
    [switch]$All,
    [string]$InstallDrive = "E"
)

$ErrorActionPreference = "Stop"

# ===========================================
# Configuration
# ===========================================
$INSTALL_DRIVE = "${InstallDrive}:"
$COMFYUI_PATH = "$INSTALL_DRIVE\ComfyUI"
$OLLAMA_MODELS_PATH = "$INSTALL_DRIVE\Ollama\models"
$KRYA_DATA_PATH = "$INSTALL_DRIVE\Krya"
$VERSION_CACHE_FILE = "$KRYA_DATA_PATH\model_versions.json"

# Ollama models to install (with vision capabilities)
$OLLAMA_MODELS = @(
    @{ Name = "llama3.2"; Description = "Fast general-purpose LLM (3B)"; Required = $true },
    @{ Name = "llama3.2-vision"; Description = "Vision model for image understanding (11B)"; Required = $true },
    @{ Name = "llava:13b"; Description = "Large vision-language model"; Required = $false },
    @{ Name = "llava:34b"; Description = "Largest LLaVA model (requires 24GB+ VRAM)"; Required = $false },
    @{ Name = "moondream"; Description = "Lightweight vision model (1.8B)"; Required = $false },
    @{ Name = "bakllava"; Description = "BakLLaVA vision model"; Required = $false },
    @{ Name = "minicpm-v"; Description = "Efficient vision model"; Required = $false }
)

# ComfyUI models to download - Organized by category
# ===========================================
# IMAGE MODELS
# ===========================================
$COMFYUI_IMAGE_MODELS = @(
    # --- FLUX Models (Best Quality) ---
    @{
        Name = "flux1-dev.safetensors"
        Url = "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors"
        Path = "checkpoints"
        Size = "23.8 GB"
        Required = $true
        Description = "FLUX.1 Dev - Near cloud quality, best open-source image model"
        Category = "Image - Premium"
    },
    @{
        Name = "flux1-schnell.safetensors"
        Url = "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors"
        Path = "checkpoints"
        Size = "23.8 GB"
        Required = $false
        Description = "FLUX.1 Schnell - Faster generation, slightly lower quality"
        Category = "Image - Premium"
    },
    @{
        Name = "ae.safetensors"
        Url = "https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors"
        Path = "vae"
        Size = "335 MB"
        Required = $true
        Description = "FLUX VAE - Required for FLUX models"
        Category = "Image - Premium"
    },
    # --- SD3 Medium (Good Text Rendering) ---
    @{
        Name = "sd3_medium_incl_clips_t5xxlfp8.safetensors"
        Url = "https://huggingface.co/stabilityai/stable-diffusion-3-medium/resolve/main/sd3_medium_incl_clips_t5xxlfp8.safetensors"
        Path = "checkpoints"
        Size = "5.5 GB"
        Required = $false
        Description = "SD3 Medium - Excellent text rendering in images"
        Category = "Image - Premium"
    },
    # --- SDXL (Versatile, Large Ecosystem) ---
    @{
        Name = "sd_xl_base_1.0.safetensors"
        Url = "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
        Path = "checkpoints"
        Size = "6.94 GB"
        Required = $true
        Description = "SDXL Base - Versatile, huge LoRA ecosystem"
        Category = "Image - Standard"
    },
    @{
        Name = "sd_xl_refiner_1.0.safetensors"
        Url = "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors"
        Path = "checkpoints"
        Size = "6.08 GB"
        Required = $false
        Description = "SDXL Refiner - Enhances SDXL base output"
        Category = "Image - Standard"
    },
    @{
        Name = "sdxl_vae.safetensors"
        Url = "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors"
        Path = "vae"
        Size = "335 MB"
        Required = $true
        Description = "SDXL VAE - Required for SDXL models"
        Category = "Image - Standard"
    },
    # --- Playground v2.5 (Aesthetic) ---
    @{
        Name = "playground-v2.5-1024px-aesthetic.fp16.safetensors"
        Url = "https://huggingface.co/playgroundai/playground-v2.5-1024px-aesthetic/resolve/main/playground-v2.5-1024px-aesthetic.fp16.safetensors"
        Path = "checkpoints"
        Size = "5.7 GB"
        Required = $false
        Description = "Playground v2.5 - Excellent aesthetic quality"
        Category = "Image - Standard"
    }
)

# ===========================================
# VIDEO MODELS
# ===========================================
$COMFYUI_VIDEO_MODELS = @(
    # --- CogVideoX (Best Open-Source Video) ---
    @{
        Name = "CogVideoX-5b-I2V.safetensors"
        Url = "https://huggingface.co/THUDM/CogVideoX-5b-I2V/resolve/main/CogVideoX-5b-I2V.safetensors"
        Path = "checkpoints/cogvideo"
        Size = "20.8 GB"
        Required = $false
        Description = "CogVideoX 5B I2V - Best open-source video, image-to-video"
        Category = "Video - Premium"
    },
    @{
        Name = "CogVideoX-5b.safetensors"
        Url = "https://huggingface.co/THUDM/CogVideoX-5b/resolve/main/CogVideoX-5b.safetensors"
        Path = "checkpoints/cogvideo"
        Size = "20.8 GB"
        Required = $false
        Description = "CogVideoX 5B T2V - Text-to-video generation"
        Category = "Video - Premium"
    },
    # --- Hunyuan Video (High Quality, Full VRAM) ---
    @{
        Name = "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors"
        Url = "https://huggingface.co/Kijai/HunyuanVideo_comfy/resolve/main/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors"
        Path = "checkpoints/hunyuan"
        Size = "13.2 GB"
        Required = $false
        Description = "Hunyuan Video 720p FP8 - High quality, optimized for RTX"
        Category = "Video - Premium"
    },
    @{
        Name = "hunyuan_video_vae_fp32.safetensors"
        Url = "https://huggingface.co/Kijai/HunyuanVideo_comfy/resolve/main/hunyuan_video_vae_fp32.safetensors"
        Path = "vae"
        Size = "982 MB"
        Required = $false
        Description = "Hunyuan Video VAE - Required for Hunyuan Video"
        Category = "Video - Premium"
    },
    # --- Mochi (Good Balance) ---
    @{
        Name = "mochi_preview_bf16.safetensors"
        Url = "https://huggingface.co/Kijai/Mochi_preview_comfy/resolve/main/mochi_preview_bf16.safetensors"
        Path = "checkpoints/mochi"
        Size = "20.4 GB"
        Required = $false
        Description = "Mochi 1 Preview - Good balance of quality and speed"
        Category = "Video - Standard"
    },
    # --- Stable Video Diffusion (Reliable) ---
    @{
        Name = "svd_xt_1_1.safetensors"
        Url = "https://huggingface.co/stabilityai/stable-video-diffusion-img2vid-xt-1-1/resolve/main/svd_xt_1_1.safetensors"
        Path = "checkpoints"
        Size = "9.56 GB"
        Required = $true
        Description = "SVD XT 1.1 - Reliable image-to-video, well supported"
        Category = "Video - Standard"
    },
    # --- LTX Video (Fast) ---
    @{
        Name = "ltx-video-2b-v0.9.safetensors"
        Url = "https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.safetensors"
        Path = "checkpoints/ltx"
        Size = "8.1 GB"
        Required = $false
        Description = "LTX Video 2B - Fast video generation"
        Category = "Video - Standard"
    }
)

# ===========================================
# CLIP/TEXT ENCODERS (Required for models)
# ===========================================
$COMFYUI_CLIP_MODELS = @(
    @{
        Name = "clip_l.safetensors"
        Url = "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors"
        Path = "clip"
        Size = "246 MB"
        Required = $true
        Description = "CLIP-L - Required for FLUX and SD3"
        Category = "Text Encoder"
    },
    @{
        Name = "t5xxl_fp8_e4m3fn.safetensors"
        Url = "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors"
        Path = "clip"
        Size = "4.89 GB"
        Required = $true
        Description = "T5-XXL FP8 - Required for FLUX (memory efficient)"
        Category = "Text Encoder"
    }
)

# Combine all models
$COMFYUI_MODELS = $COMFYUI_IMAGE_MODELS + $COMFYUI_VIDEO_MODELS + $COMFYUI_CLIP_MODELS

# ===========================================
# Helper Functions
# ===========================================
function Write-Header { param($text) Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Write-Success { param($text) Write-Host "[OK] $text" -ForegroundColor Green }
function Write-Info { param($text) Write-Host "[INFO] $text" -ForegroundColor Yellow }
function Write-Err { param($text) Write-Host "[ERROR] $text" -ForegroundColor Red }
function Write-Progress2 { param($text) Write-Host "[...] $text" -ForegroundColor Gray }

function Get-LocalIP {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.PrefixOrigin -eq "Dhcp" } |
           Select-Object -First 1).IPAddress
    if (-not $ip) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 |
               Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } |
               Select-Object -First 1).IPAddress
    }
    return $ip
}

function Ensure-Directory {
    param($path)
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

function Get-FileHash256 {
    param($filePath)
    if (Test-Path $filePath) {
        return (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
    }
    return $null
}

function Download-FileWithProgress {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$Description
    )

    Write-Progress2 "Downloading $Description..."

    try {
        # Use BITS for large files (more reliable)
        $fileName = Split-Path $OutputPath -Leaf
        Start-BitsTransfer -Source $Url -Destination $OutputPath -Description "Downloading $Description" -DisplayName $fileName
        Write-Success "Downloaded: $Description"
        return $true
    }
    catch {
        # Fallback to Invoke-WebRequest
        try {
            Write-Info "BITS transfer failed, trying alternative method..."
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
            $ProgressPreference = 'Continue'
            Write-Success "Downloaded: $Description"
            return $true
        }
        catch {
            Write-Err "Failed to download $Description`: $_"
            return $false
        }
    }
}

# ===========================================
# Version Cache Management
# ===========================================
function Get-VersionCache {
    Ensure-Directory $KRYA_DATA_PATH
    if (Test-Path $VERSION_CACHE_FILE) {
        return Get-Content $VERSION_CACHE_FILE | ConvertFrom-Json
    }
    return @{
        lastCheck = $null
        ollama = @{}
        comfyui = @{}
    }
}

function Save-VersionCache {
    param($cache)
    Ensure-Directory $KRYA_DATA_PATH
    $cache | ConvertTo-Json -Depth 10 | Set-Content $VERSION_CACHE_FILE
}

function Get-OllamaModelInfo {
    param($modelName)
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:11434/api/show" -Method Post -Body (@{name=$modelName} | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
        return @{
            digest = $response.digest
            size = $response.size
            modified = $response.modified_at
        }
    }
    catch {
        return $null
    }
}

# ===========================================
# Install Prerequisites
# ===========================================
function Install-Prerequisites {
    Write-Header "Checking Prerequisites"

    # Check if E: drive exists
    if (-not (Test-Path $INSTALL_DRIVE)) {
        Write-Err "Drive $INSTALL_DRIVE does not exist!"
        Write-Info "Please ensure drive $InstallDrive is available or specify a different drive with -InstallDrive"
        return $false
    }
    Write-Success "Drive $INSTALL_DRIVE is available"

    # Check for Python
    $python = Get-Command python -ErrorAction SilentlyContinue
    if (-not $python) {
        Write-Err "Python not found. Please install Python 3.10+ first."
        Write-Info "Download from: https://www.python.org/downloads/"
        Write-Info "Make sure to check 'Add Python to PATH' during installation"
        return $false
    }
    $pythonVersion = python --version 2>&1
    Write-Success "Python found: $pythonVersion"

    # Check for Git
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-Err "Git not found. Please install Git first."
        Write-Info "Download from: https://git-scm.com/download/win"
        return $false
    }
    Write-Success "Git found"

    # Create directories
    Ensure-Directory $KRYA_DATA_PATH
    Write-Success "Krya data directory: $KRYA_DATA_PATH"

    return $true
}

# ===========================================
# Install ComfyUI
# ===========================================
function Install-ComfyUI {
    Write-Header "Installing ComfyUI to $COMFYUI_PATH"

    if (Test-Path $COMFYUI_PATH) {
        Write-Info "ComfyUI already exists at $COMFYUI_PATH"

        # Check for updates
        Write-Info "Checking for ComfyUI updates..."
        Push-Location $COMFYUI_PATH
        try {
            git fetch origin
            $behind = git rev-list HEAD..origin/master --count 2>$null
            if ($behind -gt 0) {
                Write-Info "Update available ($behind commits behind)"
                $update = Read-Host "Update ComfyUI? [Y/n]"
                if ($update -ne "n") {
                    git pull origin master
                    pip install -r requirements.txt --quiet
                    Write-Success "ComfyUI updated"
                }
            } else {
                Write-Success "ComfyUI is up to date"
            }
        }
        catch {
            Write-Info "Could not check for updates"
        }
        Pop-Location
        return
    }

    Write-Info "Cloning ComfyUI..."
    git clone https://github.com/comfyanonymous/ComfyUI.git $COMFYUI_PATH

    Push-Location $COMFYUI_PATH

    Write-Info "Installing PyTorch with CUDA support..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

    Write-Info "Installing ComfyUI dependencies..."
    pip install -r requirements.txt

    Pop-Location

    # Create model directories
    # Create model directories including subdirs for video models
    $modelDirs = @(
        "checkpoints",
        "checkpoints/cogvideo",
        "checkpoints/hunyuan",
        "checkpoints/mochi",
        "checkpoints/ltx",
        "vae",
        "clip",
        "loras",
        "controlnet",
        "upscale_models",
        "embeddings"
    )
    foreach ($dir in $modelDirs) {
        Ensure-Directory "$COMFYUI_PATH\models\$dir"
    }

    Write-Success "ComfyUI installed at $COMFYUI_PATH"
    Write-Info "RTX 5090 optimized - ready for Flux, CogVideoX, Hunyuan Video"
}

# ===========================================
# Install Ollama
# ===========================================
function Install-Ollama {
    Write-Header "Installing Ollama"

    $ollama = Get-Command ollama -ErrorAction SilentlyContinue

    if (-not $ollama) {
        Write-Info "Downloading Ollama installer..."
        $installerUrl = "https://ollama.ai/download/OllamaSetup.exe"
        $installerPath = "$env:TEMP\OllamaSetup.exe"

        Download-FileWithProgress -Url $installerUrl -OutputPath $installerPath -Description "Ollama Installer"

        Write-Info "Running Ollama installer..."
        Write-Info "Please complete the installation wizard"
        Start-Process -FilePath $installerPath -Wait

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        $ollama = Get-Command ollama -ErrorAction SilentlyContinue
        if (-not $ollama) {
            Write-Err "Ollama installation may have failed. Please install manually."
            return
        }
        Write-Success "Ollama installed"
    } else {
        Write-Info "Ollama already installed"

        # Check for Ollama updates
        Write-Info "Checking for Ollama updates..."
        try {
            $currentVersion = ollama --version 2>&1
            Write-Info "Current version: $currentVersion"
        }
        catch {
            Write-Info "Could not determine Ollama version"
        }
    }

    # Configure Ollama for network access
    Write-Info "Configuring Ollama for network access..."
    [Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "Machine")
    $env:OLLAMA_HOST = "0.0.0.0:11434"

    # Set custom models directory on E: drive
    Ensure-Directory $OLLAMA_MODELS_PATH
    [Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $OLLAMA_MODELS_PATH, "Machine")
    $env:OLLAMA_MODELS = $OLLAMA_MODELS_PATH

    Write-Success "Ollama configured"
    Write-Info "Models will be stored in: $OLLAMA_MODELS_PATH"
    Write-Info "Network access enabled on: 0.0.0.0:11434"
}

# ===========================================
# Download Ollama Models
# ===========================================
function Download-OllamaModels {
    Write-Header "Downloading Ollama Models"

    # Ensure Ollama is running
    $ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if (-not $ollamaProcess) {
        Write-Info "Starting Ollama service..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }

    Write-Host ""
    Write-Host "Available models:" -ForegroundColor White
    Write-Host ""

    $i = 1
    foreach ($model in $OLLAMA_MODELS) {
        $required = if ($model.Required) { "[REQUIRED]" } else { "[Optional]" }
        $color = if ($model.Required) { "Yellow" } else { "Gray" }
        Write-Host "  $i. $($model.Name)" -ForegroundColor $color -NoNewline
        Write-Host " - $($model.Description) $required" -ForegroundColor Gray
        $i++
    }

    Write-Host ""
    $choice = Read-Host "Install (A)ll required, (S)elect models, or (C)ancel? [A/S/C]"

    $modelsToInstall = @()

    switch ($choice.ToUpper()) {
        "A" {
            $modelsToInstall = $OLLAMA_MODELS | Where-Object { $_.Required }
        }
        "S" {
            Write-Host "Enter model numbers separated by commas (e.g., 1,2,4):"
            $selection = Read-Host
            $indices = $selection -split "," | ForEach-Object { [int]$_.Trim() - 1 }
            $modelsToInstall = $indices | ForEach-Object { $OLLAMA_MODELS[$_] } | Where-Object { $_ -ne $null }
        }
        "C" {
            Write-Info "Model installation cancelled"
            return
        }
        default {
            $modelsToInstall = $OLLAMA_MODELS | Where-Object { $_.Required }
        }
    }

    $total = $modelsToInstall.Count
    $current = 0

    foreach ($model in $modelsToInstall) {
        $current++
        Write-Host ""
        Write-Info "[$current/$total] Pulling $($model.Name)..."
        Write-Info "$($model.Description)"

        try {
            $process = Start-Process -FilePath "ollama" -ArgumentList "pull $($model.Name)" -NoNewWindow -Wait -PassThru
            if ($process.ExitCode -eq 0) {
                Write-Success "Installed: $($model.Name)"
            } else {
                Write-Err "Failed to install: $($model.Name)"
            }
        }
        catch {
            Write-Err "Error installing $($model.Name)`: $_"
        }
    }

    # Update version cache
    $cache = Get-VersionCache
    $cache.lastCheck = (Get-Date).ToString("o")
    foreach ($model in $modelsToInstall) {
        $info = Get-OllamaModelInfo -modelName $model.Name
        if ($info) {
            $cache.ollama[$model.Name] = $info
        }
    }
    Save-VersionCache $cache

    Write-Success "Ollama model installation complete"
}

# ===========================================
# Download ComfyUI Models
# ===========================================
function Download-ComfyUIModels {
    Write-Header "Downloading ComfyUI Models for RTX 5090"

    if (-not (Test-Path $COMFYUI_PATH)) {
        Write-Err "ComfyUI not installed. Run with -InstallComfyUI first."
        return
    }

    # Group models by category
    $categories = $COMFYUI_MODELS | Group-Object -Property { $_.Category } | Sort-Object Name

    Write-Host ""
    Write-Host "Available models (optimized for RTX 5090 32GB):" -ForegroundColor White
    Write-Host ""

    $i = 1
    $modelIndex = @{}

    foreach ($category in $categories) {
        Write-Host "  --- $($category.Name) ---" -ForegroundColor Cyan
        foreach ($model in $category.Group) {
            $modelIndex[$i] = $model
            $required = if ($model.Required) { "[REQUIRED]" } else { "" }
            $color = if ($model.Required) { "Yellow" } else { "Gray" }
            $exists = Test-Path "$COMFYUI_PATH\models\$($model.Path)\$($model.Name)"
            $status = if ($exists) { "[Installed]" } else { "" }

            Write-Host "  $i. " -NoNewline -ForegroundColor White
            Write-Host "$($model.Name)" -ForegroundColor $color -NoNewline
            Write-Host " ($($model.Size)) $required $status" -ForegroundColor DarkGray

            if ($model.Description) {
                Write-Host "      $($model.Description)" -ForegroundColor DarkGray
            }
            $i++
        }
        Write-Host ""
    }

    # Calculate total size for required models
    $requiredSize = ($COMFYUI_MODELS | Where-Object { $_.Required } | ForEach-Object {
        $size = $_.Size -replace '[^\d.]', ''
        if ($_.Size -match 'GB') { [float]$size } else { [float]$size / 1024 }
    } | Measure-Object -Sum).Sum
    Write-Host "  Total size for required models: ~$([math]::Round($requiredSize, 1)) GB" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "  Options:" -ForegroundColor White
    Write-Host "    A = All required (essential for operation)" -ForegroundColor Gray
    Write-Host "    P = Premium pack (FLUX + CogVideoX + Hunyuan)" -ForegroundColor Gray
    Write-Host "    S = Select specific models" -ForegroundColor Gray
    Write-Host "    M = Missing only (skip installed)" -ForegroundColor Gray
    Write-Host "    C = Cancel" -ForegroundColor Gray
    Write-Host ""
    $choice = Read-Host "Choose option [A/P/S/M/C]"

    $modelsToInstall = @()

    switch ($choice.ToUpper()) {
        "A" {
            $modelsToInstall = $COMFYUI_MODELS | Where-Object { $_.Required }
        }
        "P" {
            # Premium pack: Best image model (FLUX) + Best video models
            $premiumModels = @(
                "flux1-dev.safetensors",
                "ae.safetensors",
                "clip_l.safetensors",
                "t5xxl_fp8_e4m3fn.safetensors",
                "CogVideoX-5b-I2V.safetensors",
                "CogVideoX-5b.safetensors",
                "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",
                "hunyuan_video_vae_fp32.safetensors"
            )
            $modelsToInstall = $COMFYUI_MODELS | Where-Object { $premiumModels -contains $_.Name }
            Write-Info "Premium pack selected: FLUX.1 Dev + CogVideoX + Hunyuan Video"
            Write-Info "Total download: ~83 GB"
        }
        "S" {
            Write-Host "Enter model numbers separated by commas (e.g., 1,2,4):"
            $selection = Read-Host
            $indices = $selection -split "," | ForEach-Object { [int]$_.Trim() }
            $modelsToInstall = $indices | ForEach-Object { $modelIndex[$_] } | Where-Object { $_ -ne $null }
        }
        "M" {
            $modelsToInstall = $COMFYUI_MODELS | Where-Object {
                -not (Test-Path "$COMFYUI_PATH\models\$($_.Path)\$($_.Name)")
            }
        }
        "C" {
            Write-Info "Model installation cancelled"
            return
        }
        default {
            $modelsToInstall = $COMFYUI_MODELS | Where-Object { $_.Required }
        }
    }

    # Filter out already installed
    $modelsToInstall = $modelsToInstall | Where-Object {
        $path = "$COMFYUI_PATH\models\$($_.Path)\$($_.Name)"
        if (Test-Path $path) {
            Write-Info "Skipping $($_.Name) - already installed"
            return $false
        }
        return $true
    }

    if ($modelsToInstall.Count -eq 0) {
        Write-Info "No models to install"
        return
    }

    $total = $modelsToInstall.Count
    $current = 0

    foreach ($model in $modelsToInstall) {
        $current++
        $outputPath = "$COMFYUI_PATH\models\$($model.Path)\$($model.Name)"

        Ensure-Directory (Split-Path $outputPath -Parent)

        Write-Host ""
        Write-Info "[$current/$total] Downloading $($model.Name) ($($model.Size))..."

        $success = Download-FileWithProgress -Url $model.Url -OutputPath $outputPath -Description $model.Name

        if ($success) {
            # Update version cache
            $cache = Get-VersionCache
            $hash = Get-FileHash256 $outputPath
            $cache.comfyui[$model.Name] = @{
                hash = $hash
                downloaded = (Get-Date).ToString("o")
                size = (Get-Item $outputPath).Length
            }
            Save-VersionCache $cache
        }
    }

    Write-Success "ComfyUI model installation complete"
}

# ===========================================
# Check for Model Updates
# ===========================================
function Check-ModelUpdates {
    Write-Header "Checking for Model Updates"

    $cache = Get-VersionCache
    $updates = @()

    # Check Ollama models
    Write-Info "Checking Ollama models..."

    # Ensure Ollama is running
    $ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if (-not $ollamaProcess) {
        Write-Info "Starting Ollama service..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }

    try {
        $installedModels = ollama list 2>&1

        foreach ($model in $OLLAMA_MODELS) {
            if ($installedModels -match $model.Name) {
                Write-Progress2 "Checking $($model.Name)..."

                # Check if update is available
                try {
                    $pullOutput = ollama pull $model.Name 2>&1
                    if ($pullOutput -match "up to date") {
                        Write-Host "  $($model.Name): " -NoNewline
                        Write-Host "Up to date" -ForegroundColor Green
                    } else {
                        Write-Host "  $($model.Name): " -NoNewline
                        Write-Host "Updated!" -ForegroundColor Yellow
                        $updates += @{ Type = "ollama"; Name = $model.Name }
                    }
                }
                catch {
                    Write-Host "  $($model.Name): " -NoNewline
                    Write-Host "Check failed" -ForegroundColor Red
                }
            }
        }
    }
    catch {
        Write-Err "Could not check Ollama models: $_"
    }

    # Update cache
    $cache.lastCheck = (Get-Date).ToString("o")
    Save-VersionCache $cache

    Write-Host ""
    if ($updates.Count -gt 0) {
        Write-Success "$($updates.Count) model(s) were updated"
    } else {
        Write-Success "All models are up to date"
    }

    Write-Info "Last check: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# ===========================================
# Update All Models
# ===========================================
function Update-AllModels {
    Write-Header "Updating All Models"

    # Update Ollama models
    Write-Info "Updating Ollama models..."

    $ollamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if (-not $ollamaProcess) {
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }

    try {
        $installedModels = ollama list 2>&1
        $modelNames = ($installedModels | Select-Object -Skip 1 | ForEach-Object { ($_ -split "\s+")[0] }) | Where-Object { $_ }

        foreach ($name in $modelNames) {
            Write-Info "Updating $name..."
            ollama pull $name
        }
    }
    catch {
        Write-Err "Error updating Ollama models: $_"
    }

    # Update ComfyUI
    if (Test-Path $COMFYUI_PATH) {
        Write-Info "Checking ComfyUI for updates..."
        Push-Location $COMFYUI_PATH
        try {
            git fetch origin
            $status = git status -uno 2>&1
            if ($status -match "behind") {
                Write-Info "Updating ComfyUI..."
                git pull origin master
                pip install -r requirements.txt --quiet
                Write-Success "ComfyUI updated"
            } else {
                Write-Success "ComfyUI is up to date"
            }
        }
        catch {
            Write-Err "Could not update ComfyUI: $_"
        }
        Pop-Location
    }

    Write-Success "Update complete"
}

# ===========================================
# Configure Firewall
# ===========================================
function Configure-Firewall {
    Write-Header "Configuring Windows Firewall"

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-Err "Please run this script as Administrator to configure firewall"
        return
    }

    # ComfyUI rule
    $comfyRule = Get-NetFirewallRule -DisplayName "Krya - ComfyUI" -ErrorAction SilentlyContinue
    if (-not $comfyRule) {
        New-NetFirewallRule -DisplayName "Krya - ComfyUI" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 8188 `
            -Action Allow `
            -Description "Allow ComfyUI connections from Krya server"
        Write-Success "Firewall rule added for ComfyUI (port 8188)"
    } else {
        Write-Info "ComfyUI firewall rule already exists"
    }

    # Ollama rule
    $ollamaRule = Get-NetFirewallRule -DisplayName "Krya - Ollama" -ErrorAction SilentlyContinue
    if (-not $ollamaRule) {
        New-NetFirewallRule -DisplayName "Krya - Ollama" `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 11434 `
            -Action Allow `
            -Description "Allow Ollama connections from Krya server"
        Write-Success "Firewall rule added for Ollama (port 11434)"
    } else {
        Write-Info "Ollama firewall rule already exists"
    }
}

# ===========================================
# Create Startup Scripts
# ===========================================
function Create-StartupScripts {
    Write-Header "Creating Startup Scripts"

    $LocalIP = Get-LocalIP
    $scriptsPath = "$env:USERPROFILE\Desktop\Krya GPU Worker"
    New-Item -ItemType Directory -Force -Path $scriptsPath | Out-Null

    # ComfyUI starter
    $comfyScript = @"
@echo off
title Krya GPU Worker - ComfyUI
echo Starting ComfyUI for network access...
echo.
echo Access locally: http://127.0.0.1:8188
echo Access from network: http://$LocalIP:8188
echo.
cd /d $COMFYUI_PATH
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header --preview-method auto
pause
"@
    Set-Content -Path "$scriptsPath\Start-ComfyUI.bat" -Value $comfyScript
    Write-Success "Created: Start-ComfyUI.bat"

    # Ollama starter
    $ollamaScript = @"
@echo off
title Krya GPU Worker - Ollama
echo Starting Ollama for network access...
echo.
echo Access from network: http://$LocalIP:11434
echo.
set OLLAMA_HOST=0.0.0.0:11434
set OLLAMA_MODELS=$OLLAMA_MODELS_PATH
ollama serve
pause
"@
    Set-Content -Path "$scriptsPath\Start-Ollama.bat" -Value $ollamaScript
    Write-Success "Created: Start-Ollama.bat"

    # Combined starter
    $combinedScript = @"
@echo off
title Krya GPU Worker
echo ========================================
echo   Krya GPU Worker - Starting Services
echo ========================================
echo.
echo Your IP Address: $LocalIP
echo Install Drive: $INSTALL_DRIVE
echo.
echo Starting Ollama...
set OLLAMA_HOST=0.0.0.0:11434
set OLLAMA_MODELS=$OLLAMA_MODELS_PATH
start "Ollama" cmd /c "set OLLAMA_HOST=0.0.0.0:11434 && set OLLAMA_MODELS=$OLLAMA_MODELS_PATH && ollama serve"
timeout /t 3
echo Starting ComfyUI...
start "ComfyUI" cmd /c "cd /d $COMFYUI_PATH && python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header --preview-method auto"
echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo ComfyUI: http://$LocalIP:8188
echo Ollama:  http://$LocalIP:11434
echo.
echo Configure your Linux VM with:
echo   COMFYUI_URL=http://$LocalIP:8188
echo   OLLAMA_URL=http://$LocalIP:11434
echo.
pause
"@
    Set-Content -Path "$scriptsPath\Start-All.bat" -Value $combinedScript
    Write-Success "Created: Start-All.bat"

    # Update checker script
    $updateScript = @"
@echo off
title Krya GPU Worker - Update Checker
echo ========================================
echo   Krya GPU Worker - Checking Updates
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\setup-gpu-worker.ps1" -CheckUpdates
pause
"@
    Set-Content -Path "$scriptsPath\Check-Updates.bat" -Value $updateScript
    Write-Success "Created: Check-Updates.bat"

    # Full update script
    $fullUpdateScript = @"
@echo off
title Krya GPU Worker - Full Update
echo ========================================
echo   Krya GPU Worker - Updating Everything
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\setup-gpu-worker.ps1" -UpdateModels
pause
"@
    Set-Content -Path "$scriptsPath\Update-All.bat" -Value $fullUpdateScript
    Write-Success "Created: Update-All.bat"

    # Create desktop shortcut
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Krya GPU Worker.lnk")
    $Shortcut.TargetPath = "$scriptsPath\Start-All.bat"
    $Shortcut.WorkingDirectory = $scriptsPath
    $Shortcut.IconLocation = "shell32.dll,21"
    $Shortcut.Save()
    Write-Success "Created desktop shortcut: Krya GPU Worker"
}

# ===========================================
# Banner
# ===========================================
$LocalIP = Get-LocalIP

Write-Host @"

 _  __                   ____ ____  _   _  __        __         _
| |/ /_ __ _   _  __ _  / ___|  _ \| | | | \ \      / /__  _ __| | _____ _ __
| ' /| '__| | | |/ _` | | |  _| |_) | | | |  \ \ /\ / / _ \| '__| |/ / _ \ '__|
| . \| |  | |_| | (_| | | |_| |  __/| |_| |   \ V  V / (_) | |  |   <  __/ |
|_|\_\_|   \__, |\__,_|  \____|_|    \___/     \_/\_/ \___/|_|  |_|\_\___|_|
           |___/

"@ -ForegroundColor Magenta

Write-Host "GPU Worker Setup for Windows" -ForegroundColor White
Write-Host "Install Drive: $INSTALL_DRIVE" -ForegroundColor Cyan
Write-Host "Your IP Address: $LocalIP" -ForegroundColor Yellow
Write-Host ""

# ===========================================
# Main
# ===========================================

# Check prerequisites first
if (-not (Install-Prerequisites)) {
    Write-Err "Prerequisites check failed. Please resolve the issues above."
    exit 1
}

# Determine what to run
$runAll = $All -or (-not $InstallComfyUI -and -not $InstallOllama -and -not $DownloadModels -and -not $ConfigureFirewall -and -not $CreateStartupScripts -and -not $UpdateModels -and -not $CheckUpdates)

if ($CheckUpdates) {
    Check-ModelUpdates
    exit 0
}

if ($UpdateModels) {
    Update-AllModels
    exit 0
}

if ($runAll -or $InstallComfyUI) { Install-ComfyUI }
if ($runAll -or $InstallOllama) { Install-Ollama }
if ($runAll -or $DownloadModels) {
    Download-OllamaModels
    Download-ComfyUIModels
}
if ($runAll -or $ConfigureFirewall) { Configure-Firewall }
if ($runAll -or $CreateStartupScripts) { Create-StartupScripts }

Write-Header "Setup Complete!"

Write-Host @"

Installation Summary:
---------------------
ComfyUI:      $COMFYUI_PATH
Ollama:       $OLLAMA_MODELS_PATH
Config:       $KRYA_DATA_PATH

Next Steps:
-----------
1. Double-click "Krya GPU Worker" on your desktop to start services

2. Configure your Linux VM with these environment variables:

   COMFYUI_URL=http://$LocalIP:8188
   COMFYUI_OUTPUT_URL=http://$LocalIP:8188/view
   OLLAMA_URL=http://$LocalIP:11434

3. To check for model updates later, run:
   .\setup-gpu-worker.ps1 -CheckUpdates

4. To update all models, run:
   .\setup-gpu-worker.ps1 -UpdateModels

"@ -ForegroundColor White
