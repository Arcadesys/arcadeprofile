const missingDatabaseURLPlaceholder = 'postgresql://missing-database-url.invalid/missing';

type PayloadConfigEnvOptions = {
  requireDatabaseURL?: boolean;
};

function readDatabaseURL(): string | undefined {
  return process.env.DATABASE_URL || process.env.DATABASE_URI;
}

export function hasConfiguredDatabaseURL(): boolean {
  const databaseURL = readDatabaseURL();
  return Boolean(databaseURL && databaseURL !== missingDatabaseURLPlaceholder);
}

export function getDatabaseURLForPayloadConfig(options: PayloadConfigEnvOptions = {}): string {
  const databaseURL = readDatabaseURL();

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
  const databaseURL = readDatabaseURL();

  if (!databaseURL) {
    throw new Error('Missing DATABASE_URL environment variable. Set DATABASE_URL to the production Postgres connection string.');
  }

  return databaseURL;
}

const developmentPayloadSecretFallback =
  'development-only-payload-secret-do-not-use-in-prod';

export function getPayloadSecret(): string {
  const secret = process.env.PAYLOAD_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing PAYLOAD_SECRET environment variable. Set PAYLOAD_SECRET to a random, high-entropy string before booting Payload in production.',
    );
  }

  return developmentPayloadSecretFallback;
}
