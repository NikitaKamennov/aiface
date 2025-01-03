@echo off
setlocal enabledelayedexpansion

:: Задаем переменные
set APP_NAME=aiface
set PORT=3003

echo Restarting container...

:: Останавливаем контейнер если он запущен
echo Stopping container if running...
docker stop %APP_NAME% 2>nul
if !errorlevel! equ 0 (
    echo Container stopped successfully
) else (
    echo No container to stop
)

:: Запускаем контейнер
echo Starting container...
docker start %APP_NAME%
if !errorlevel! equ 0 (
    echo Container started successfully
    echo Application is running on http://localhost:%PORT%
) else (
    echo Error starting container
)

echo.
pause
