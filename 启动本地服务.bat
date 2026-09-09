@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   Explorers Compass - local server
echo   ================================
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  echo Starting with python: http://localhost:8000
  start "" http://localhost:8000
  python -m http.server 8000
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Starting with py: http://localhost:8000
  start "" http://localhost:8000
  py -m http.server 8000
  goto :eof
)

where node >nul 2>nul
if %errorlevel%==0 (
  echo Starting with node: http://localhost:8000
  start "" http://localhost:8000
  node serve.js
  goto :eof
)

echo No python or node found.
echo Please install Node.js, or just double-click index.html
pause
