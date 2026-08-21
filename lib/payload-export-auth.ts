export const payloadExportAuthSchemes = ['users-api-key', 'jwt', 'bearer', 'none'] as const;

export type PayloadExportAuthScheme = (typeof payloadExportAuthSchemes)[number];
export type PayloadExportCredentialSource = 'cli' | 'PAYLOAD_EXPORT_TOKEN' | 'PAYLOAD_API_KEY' | 'none';

export type PayloadExportAuth = {
  scheme: PayloadExportAuthScheme;
  credential?: string;
  credentialSource: PayloadExportCredentialSource;
};

function isScheme(value: string | undefined): value is PayloadExportAuthScheme {
  return Boolean(value && (payloadExportAuthSchemes as readonly string[]).includes(value));
}

export function resolvePayloadExportAuth(options: {
  credentialFromCli?: string;
  schemeFromCli?: string;
  env?: Partial<Record<'PAYLOAD_EXPORT_TOKEN' | 'PAYLOAD_API_KEY' | 'PAYLOAD_EXPORT_AUTH_SCHEME', string | undefined>>;
}): PayloadExportAuth {
  const env = options.env ?? process.env;
  const credential = options.credentialFromCli ?? env.PAYLOAD_EXPORT_TOKEN ?? env.PAYLOAD_API_KEY;
  const credentialSource: PayloadExportCredentialSource = options.credentialFromCli
    ? 'cli'
    : env.PAYLOAD_EXPORT_TOKEN
      ? 'PAYLOAD_EXPORT_TOKEN'
      : env.PAYLOAD_API_KEY
        ? 'PAYLOAD_API_KEY'
        : 'none';
  const requestedScheme = options.schemeFromCli ?? env.PAYLOAD_EXPORT_AUTH_SCHEME;
  if (requestedScheme && !isScheme(requestedScheme)) {
    throw new Error(`Unsupported Payload export auth scheme: ${requestedScheme}. Use ${payloadExportAuthSchemes.join(', ')}.`);
  }
  const scheme: PayloadExportAuthScheme = isScheme(requestedScheme)
    ? requestedScheme
    : credentialSource === 'PAYLOAD_API_KEY'
      ? 'users-api-key'
      : credential
        ? 'jwt'
        : 'none';
  return { scheme, credential, credentialSource };
}

export function payloadExportHeaders(auth: PayloadExportAuth): Record<string, string> | undefined {
  if (auth.scheme === 'none') return undefined;
  if (!auth.credential) throw new Error(`Payload export auth scheme ${auth.scheme} requires a credential.`);
  const authorization = auth.scheme === 'users-api-key'
    ? `users API-Key ${auth.credential}`
    : auth.scheme === 'jwt'
      ? `JWT ${auth.credential}`
      : `Bearer ${auth.credential}`;
  return { Authorization: authorization };
}

export function classifyPayloadExportFailure(status: number): string {
  if (status === 401) return 'authentication rejected; verify the selected scheme and credential without exposing it';
  if (status === 403) return 'authentication accepted but this credential is not authorized to read the collection';
  if (status === 404) return 'Payload endpoint not found; verify the base URL points to this Payload deployment';
  return `read request failed with HTTP ${status}`;
}
