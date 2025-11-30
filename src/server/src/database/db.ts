import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Supabase DATABASE_URL is required
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required!');
  console.error('   Get it from: Supabase Dashboard > Project Settings > Database > Connection string');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');

// Database connection configuration (Supabase only)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test the database connection
pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL');
});

pool.on('error', (err: any) => {
  console.error('❌ Supabase connection error:', err.message);
});

// Clean up on application exit
process.on('SIGINT', () => {
  console.log('Closing database pool');
  pool.end().then(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

export default pool;
