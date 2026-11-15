@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "Badrock-App\badrock.exe" (
    cd Badrock-App
    start "" badrock.exe
) else if exist "target\release\bedrock-server.exe" (
    start "" target\release\bedrock-server.exe
) else (
    echo [Ошибка] Файл badrock.exe не найден.
    pause
)
