@echo off
echo 🚀 Starting Tercih Sihirbazı Development Server...
echo 📍 Environment: Development
echo 🌐 URL: http://localhost:3000
echo.

REM Set environment variables
set NODE_ENV=development
set PORT=3000

REM Start the development server
echo Starting server with ts-node-dev...
npx ts-node-dev --respawn --transpile-only src/index.ts

REM If ts-node-dev fails, try ts-node
if errorlevel 1 (
    echo.
    echo 🔄 Trying with ts-node...
    npx ts-node src/index.ts
)

REM If ts-node also fails, show manual instructions
if errorlevel 1 (
    echo.
    echo ❌ Failed to start development server
    echo.
    echo 💡 To run the server manually:
    echo    1. Install dependencies: npm install
    echo    2. Build project: npm run build
    echo    3. Start server: npm start
    pause
)