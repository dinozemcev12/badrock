@echo off
chcp 65001 >nul
cd /d "%~dp0"

if exist "Badrock-App\badrock.exe" goto run_app
if exist "target\release\bedrock-server.exe" goto run_server

echo [Инфо] Скомпилированный файл не найден. Проверка наличия Cargo...
where cargo >nul 2>&1
if %errorlevel% neq 0 goto no_cargo

echo [Инфо] Cargo найден. Выполняется сборка проекта...
cargo build --release -p bedrock-server
if %errorlevel% neq 0 (
    echo [Ошибка] Сборка завершилась с ошибкой.
    pause
    exit /b 1
)

if exist "target\release\bedrock-server.exe" goto run_server

echo [Ошибка] Исполняемый файл не найден после сборки.
pause
exit /b 1

:no_cargo
echo.
echo =======================================================================
echo [Ошибка] Готовое приложение не найдено, а Rust (cargo) не установлен.
echo.
echo Если вы скачали архив исходного кода с GitHub:
echo   1. Скачайте готовую сборку из раздела Releases на GitHub (если доступна).
echo   2. Либо установите Rust с сайта https://rustup.rs/ для сборки из исходников.
echo =======================================================================
echo.
pause
exit /b 1

:run_app
cd Badrock-App
start "" badrock.exe
exit /b 0

:run_server
start "" target\release\bedrock-server.exe
exit /b 0