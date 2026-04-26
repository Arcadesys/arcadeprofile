const missingDatabaseURLPlaceholder = 'postgresql://missing-database-url.invalid/missing';

export function getDatabaseURLForPayloadConfig(): string {
  const databaseURL = process.env.DATABASE_URL || process.env.DATABASE_URI;

  if (databaseURL) {
    return databaseURL;
  }

  return missingDatabaseURLPlaceholder;
}

export function getRequiredDatabaseURL(): string {
  const databaseURL = process.env.DATABASE_URL || process.env.DATABASE_URI;

  if (!databaseURL) {
    throw new Error('Missing DATABASE_URL environment variable. Set DATABASE_URL to the production Postgres connection string.');
  }

  return databaseURL;
}
