@echo off
REM Voice Library Downloader for Windows
REM Downloads free voices from open source datasets
REM
REM Usage:
REM   download_voices.bat              Show help
REM   download_voices.bat --all        Download all datasets
REM   download_voices.bat --quick      Download essential voices only
REM   download_voices.bat --dataset vctk hifi_tts  Specific datasets

setlocal enabledelayedexpansion

set SCRIPT_DIR=%~dp0
set PYTHON_SCRIPT=%SCRIPT_DIR%download_voices.py

echo.
echo ================================================================
echo           11labs Voice Library Downloader
echo       Download 220+ free voices from open datasets
echo ================================================================
echo.

REM Check for Python
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+
    exit /b 1
)

REM Get Python version
for /f "tokens=*" %%i in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set PY_VERSION=%%i
echo Using Python %PY_VERSION%
echo.

REM Handle --help
if "%1"=="--help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="" goto :show_help

REM Handle --install-deps
if "%1"=="--install-deps" (
    echo Installing required packages...
    python -m pip install datasets soundfile numpy tqdm requests
    echo Dependencies installed.
    exit /b 0
)

REM Handle --quick
if "%1"=="--quick" (
    echo Quick mode: Downloading essential voices...
    python "%PYTHON_SCRIPT%" --dataset ljspeech hifi_tts
    exit /b 0
)
if "%1"=="-q" (
    echo Quick mode: Downloading essential voices...
    python "%PYTHON_SCRIPT%" --dataset ljspeech hifi_tts
    exit /b 0
)

REM Run the Python script with all arguments
python "%PYTHON_SCRIPT%" %*
exit /b 0

:show_help
echo Usage: %~n0 [OPTIONS]
echo.
echo Options:
echo   --all, -a           Download all available datasets
echo   --quick, -q         Download essential voices only (LJSpeech, HiFi)
echo   --dataset, -d       Download specific dataset(s)
echo   --list, -l          List all available datasets
echo   --status, -s        Show download status
echo   --force, -f         Force re-download
echo   --install-deps      Install Python dependencies
echo   --help, -h          Show this help message
echo.
echo Available datasets:
echo   vctk         - VCTK Corpus (110 English speakers with accents)
echo   hifi_tts     - Hi-Fi TTS (10 studio quality speakers)
echo   ljspeech     - LJSpeech (1 high-quality female speaker)
echo   libritts     - LibriTTS (Large English audiobook corpus)
echo   common_voice - Mozilla Common Voice (Crowdsourced multilingual)
echo   speecht5     - SpeechT5 speaker embeddings
echo.
echo Examples:
echo   %~n0 --quick                  Download essential voices
echo   %~n0 --dataset vctk hifi_tts  Download specific datasets
echo   %~n0 --all                    Download everything
echo   %~n0 --status                 Check what's downloaded
exit /b 0
