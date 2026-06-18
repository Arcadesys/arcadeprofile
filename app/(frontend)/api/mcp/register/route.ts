import type { NextRequest } from 'next/server';
import { generateClientId } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dynamic client registration (RFC 7591).
// We accept any client — PKCE + API key are the real security controls.
export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const clientId = generateClientId();
  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];

  return Response.json(
    {
      client_id: clientId,
      client_name: body.client_name ?? 'MCP Client',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
