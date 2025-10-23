@echo off
setlocal enabledelayedexpansion

REM Tercih Sihirbazı Deployment Script for Windows
echo 🚀 Starting Tercih Sihirbazı deployment...

REM Get environment parameter (default to production)
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo 📍 Environment: %ENVIRONMENT%

REM Set compose file and env file
set COMPOSE_FILE=docker-compose.yml
set ENV_FILE=.env.%ENVIRONMENT%

REM Check if environment file exists
if not exist "%ENV_FILE%" (
    echo ❌ Environment file %ENV_FILE% not found!
    echo 💡 Please create %ENV_FILE% based on .env.example
    exit /b 1
)

echo ✅ Environment file found

REM Build and start services
echo 🔨 Building and starting services...

if "%ENVIRONMENT%"=="development" (
    docker-compose -f %COMPOSE_FILE% -f docker-compose.dev.yml --env-file %ENV_FILE% up --build -d
) else if "%ENVIRONMENT%"=="production" (
    docker-compose -f %COMPOSE_FILE% -f docker-compose.prod.yml --env-file %ENV_FILE% up --build -d
) else (
    docker-compose -f %COMPOSE_FILE% --env-file %ENV_FILE% up --build -d
)

if errorlevel 1 (
    echo ❌ Failed to start services
    exit /b 1
)

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Run database migrations
echo 🗃️ Running database migrations...
docker exec tercih-sihirbazi-app node scripts/migrate.js

if errorlevel 1 (
    echo ❌ Database migration failed
    exit /b 1
)

REM Final health check
echo 🏥 Performing final health check...
timeout /t 5 /nobreak >nul

REM Try to check health endpoint (requires curl or similar)
curl -f http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️ Health check endpoint not accessible (this might be normal if curl is not installed)
) else (
    echo ✅ Application is healthy and ready!
)

echo 🎉 Deployment completed!
echo 📊 Deployment Summary:
echo    Environment: %ENVIRONMENT%
echo    Application URL: http://localhost:3000
echo    Health Check: http://localhost:3000/health

echo 💡 Useful commands:
echo    View logs: docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart: docker-compose restart
echo    Migration status: docker exec tercih-sihirbazi-app node scripts/migrate.js status

endlocal