#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'tercih_sihirbazi',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const pool = new Pool(config);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  console.log(`📍 Connecting to: ${config.host}:${config.port}/${config.database}`);

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    client.release();

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of executed migrations
    const executedResult = await pool.query('SELECT filename FROM migrations ORDER BY id');
    const executedMigrations = new Set(executedResult.rows.map(row => row.filename));

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);
    console.log(`✅ Already executed: ${executedMigrations.size} migrations`);

    let executedCount = 0;

    for (const file of migrationFiles) {
      if (executedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Executing ${file}...`);
      
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Execute migration in a transaction
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await pool.query('COMMIT');
        
        console.log(`✅ Migration ${file} completed successfully`);
        executedCount++;
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ Migration ${file} failed:`, error.message);
        throw error;
      }
    }

    if (executedCount === 0) {
      console.log('✨ All migrations are up to date!');
    } else {
      console.log(`🎉 Successfully executed ${executedCount} new migrations`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('👋 Database connection closed');
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'status') {
  // Show migration status
  (async () => {
    try {
      const client = await pool.connect();
      
      // Check if migrations table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations'
        )
      `);

      if (!tableExists.rows[0].exists) {
        console.log('📋 No migrations have been run yet');
        return;
      }

      const executedResult = await pool.query(`
        SELECT filename, executed_at 
        FROM migrations 
        ORDER BY id
      `);

      console.log('📋 Migration Status:');
      console.log('==================');
      
      if (executedResult.rows.length === 0) {
        console.log('No migrations executed yet');
      } else {
        executedResult.rows.forEach(row => {
          console.log(`✅ ${row.filename} - ${row.executed_at.toISOString()}`);
        });
      }

      client.release();
    } catch (error) {
      console.error('Error checking migration status:', error.message);
    } finally {
      await pool.end();
    }
  })();
} else {
  // Run migrations
  runMigrations();
}