@echo off
echo =========================================
echo    Starting Smart Vault Backend (FastAPI)
echo =========================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found in backend/venv.
    echo Please ensure the dependencies are installed.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
echo [INFO] Virtual environment activated.
echo [INFO] Starting Uvicorn server on http://127.0.0.1:8000
echo.

uvicorn main:app --reload
