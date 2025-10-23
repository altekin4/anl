const { execSync } = require('child_process');
const { Pool } = require('pg');

module.exports = async () => {
  console.log('🚀 Starting E2E test global setup...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.DB_NAME = 'tercih_sihirbazi_test';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';

  // Database configuration for tests
  const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: 'postgres', // Connect to postgres db to create test db
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
  };

  try {
    // Create test database if it doesn't exist
    const pool = new Pool(testDbConfig);
    
    try {
      await pool.query('CREATE DATABASE tercih_sihirbazi_test');
      console.log('✅ Test database created');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️  Test database already exists');
      } else {
        console.error('❌ Failed to create test database:', error.message);
        throw error;
      }
    }
    
    await pool.end();

    // Run migrations on test database
    const testPool = new Pool({
      ...testDbConfig,
      database: 'tercih_sihirbazi_test'
    });

    console.log('🗃️  Running test database migrations...');
    
    // Read and execute migration files
    const fs = require('fs');
    const path = require('path');
    
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await testPool.query(sql);
        console.log(`✅ Migration ${file} completed`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    await testPool.end();
    console.log('✅ Test database setup completed');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    process.exit(1);
  }
};