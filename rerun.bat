@echo off
setlocal enabledelayedexpansion

:: Задаем переменные
set APP_NAME=aiface
set PORT=3003

echo Starting deployment process...

:: 1. Останавливаем контейнер если он запущен
echo Stopping container if running...
docker stop %APP_NAME% 2>nul
if !errorlevel! equ 0 (
    echo Container stopped successfully
) else (
    echo No container to stop
)

:: 2. Удаляем старый контейнер
echo Removing old container...
docker rm %APP_NAME% 2>nul
if !errorlevel! equ 0 (
    echo Old container removed successfully
) else (
    echo No container to remove
)

:: 3. Собираем новый образ
echo Building new image...
docker build -t %APP_NAME% .
if !errorlevel! neq 0 (
    echo Error building image
    exit /b !errorlevel!
)

:: 4. Запускаем новый контейнер
echo Starting new container...
docker run -d -p %PORT%:%PORT% --add-host=host.docker.internal:host-gateway --name %APP_NAME% --restart always %APP_NAME%
if !errorlevel! neq 0 (
    echo Error starting container
    exit /b !errorlevel!
)

:: 5. Очищаем неиспользуемые образы
@REM echo Cleaning up unused images...
@REM docker image prune -f

echo.
echo Deployment completed successfully!
echo Application is running on http://localhost:%PORT%
echo.

pause
