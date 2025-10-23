#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Tercih Sihirbazı Development Server...');
console.log('📍 Environment: Development');
console.log('🌐 URL: http://localhost:3000');
console.log('');

// Set environment variables
process.env.NODE_ENV = 'development';
process.env.PORT = '3000';

// Start the development server using ts-node-dev
const serverProcess = spawn('npx', ['ts-node-dev', '--respawn', '--transpile-only', 'src/index.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  
  // Fallback: try with ts-node
  console.log('🔄 Trying with ts-node...');
  const fallbackProcess = spawn('npx', ['ts-node', 'src/index.ts'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });
  
  fallbackProcess.on('error', (fallbackError) => {
    console.error('❌ Fallback also failed:', fallbackError.message);
    console.log('');
    console.log('💡 To run the server manually:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Build project: npm run build');
    console.log('   3. Start server: npm start');
    process.exit(1);
  });
});

serverProcess.on('close', (code) => {
  console.log(`\n👋 Server stopped with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
});