import type { NextRequest } from 'next/server';
import { verifyAuthCode, verifyPkce } from '@/lib/mcp-oauth';

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

  // The access token is the MCP_API_KEY itself — existing Bearer auth in the
  // main MCP route validates it directly.
  return Response.json(
    {
      access_token: mcpApiKey,
      token_type: 'Bearer',
      expires_in: 31536000, // 1 year — rotate MCP_API_KEY to revoke
    },
    { headers: CORS },
  );
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
