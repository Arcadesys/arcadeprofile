import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL or DATABASE_URI environment variable.');
}

const isLocalConnection = /localhost|127\.0\.0\.1/i.test(connectionString);

const sql = postgres(connectionString, {
  ssl: isLocalConnection ? false : 'require',
  max: 5,
});

export default sql;
