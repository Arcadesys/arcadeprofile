const missingDatabaseURLPlaceholder = 'postgresql://missing-database-url.invalid/missing';

type PayloadConfigEnvOptions = {
  requireDatabaseURL?: boolean;
};

export function getDatabaseURLForPayloadConfig(options: PayloadConfigEnvOptions = {}): string {
  const databaseURL = process.env.DATABASE_URL || process.env.DATABASE_URI;

  if (databaseURL) {
    return databaseURL;
  }

  if (options.requireDatabaseURL) {
    throw new Error(
      'Missing DATABASE_URL environment variable. Set DATABASE_URL or DATABASE_URI before running Payload database commands.',
    );
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
