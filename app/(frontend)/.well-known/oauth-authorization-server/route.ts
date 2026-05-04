import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const origin = req.nextUrl.origin;

  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/mcp/authorize`,
      token_endpoint: `${origin}/api/mcp/token`,
      registration_endpoint: `${origin}/api/mcp/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [],
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}
