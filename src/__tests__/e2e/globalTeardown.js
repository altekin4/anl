const { Pool } = require('pg');

module.exports = async () => {
  console.log('🧹 Starting E2E test global teardown...');

  // Database configuration for cleanup
  const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    database: 'postgres', // Connect to postgres db to drop test db
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password',
  };

  try {
    const pool = new Pool(testDbConfig);
    
    // Terminate all connections to test database
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'tercih_sihirbazi_test' AND pid <> pg_backend_pid()
    `);

    // Drop test database
    try {
      await pool.query('DROP DATABASE IF EXISTS tercih_sihirbazi_test');
      console.log('✅ Test database dropped');
    } catch (error) {
      console.warn('⚠️  Could not drop test database:', error.message);
    }
    
    await pool.end();
    console.log('✅ Global teardown completed');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't exit with error code as this is cleanup
  }
};