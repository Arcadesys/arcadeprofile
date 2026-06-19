import type { NextRequest } from 'next/server';
import { generateAccessToken, verifyAuthCode, verifyPkce } from '@/lib/mcp-oauth';

// Access-token lifetime. Long enough for a connector session, short enough to
// bound exposure; rotating MCP_API_KEY invalidates all outstanding tokens.
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function tokenError(error: string, description?: string, status = 400): Response {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: CORS },
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  // Accept both application/x-www-form-urlencoded and application/json
  const ct = req.headers.get('content-type') ?? '';
  let params: URLSearchParams;
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({})) as Record<string, string>;
    params = new URLSearchParams(body);
  } else {
    params = new URLSearchParams(await req.text());
  }

  if (params.get('grant_type') !== 'authorization_code') {
    return tokenError('unsupported_grant_type');
  }

  const code = params.get('code') ?? '';
  const codeVerifier = params.get('code_verifier') ?? '';
  const redirectUri = params.get('redirect_uri') ?? '';

  if (!code || !codeVerifier) {
    return tokenError('invalid_request', 'code and code_verifier are required');
  }

  const mcpApiKey = process.env.MCP_API_KEY;
  if (!mcpApiKey) {
    return tokenError('server_error', 'Server is misconfigured', 500);
  }

  const payload = verifyAuthCode(code, mcpApiKey);
  if (!payload) {
    return tokenError('invalid_grant', 'Invalid or expired authorization code');
  }

  if (redirectUri && redirectUri !== payload.redirectUri) {
    return tokenError('invalid_grant', 'redirect_uri mismatch');
  }

  if (!verifyPkce(codeVerifier, payload.codeChallenge, payload.codeChallengeMethod)) {
    return tokenError('invalid_grant', 'PKCE verification failed');
  }

  // Issue a short-lived, scoped token signed with MCP_API_KEY — never the
  // master key itself. The main MCP route validates the signature + expiry.
  const accessToken = generateAccessToken(
    {
      scope: 'write',
      clientId: payload.clientId,
      exp: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
    },
    mcpApiKey,
  );

  return Response.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
    },
    { headers: CORS },
  );
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
