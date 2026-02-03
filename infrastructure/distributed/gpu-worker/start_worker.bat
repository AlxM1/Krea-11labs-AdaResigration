@echo off
REM 11labs GPU Worker - Windows Startup Script
REM Run this on your Windows PC with RTX 5090

echo ==========================================
echo  11labs GPU Worker
echo  Starting voice AI processing service
echo ==========================================
echo.

REM Check for Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

REM Check for CUDA
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo WARNING: NVIDIA GPU not detected
    echo The worker will run on CPU (much slower)
) else (
    echo NVIDIA GPU detected:
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
)
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Set environment variables
set HOST=0.0.0.0
set PORT=8001
set MODELS_CACHE=.\models

REM Create models directory
if not exist "models" mkdir models

echo.
echo Starting 11labs GPU Worker on port %PORT%...
echo Access from Linux VM: http://<this-pc-ip>:%PORT%
echo.

REM Start the worker
python voice_worker.py

pause
