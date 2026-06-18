import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Handles /.well-known/oauth-protected-resource/api/mcp (and any sub-path).
// Points clients to this server as the authorization server.
export async function GET(req: NextRequest): Promise<Response> {
  const origin = req.nextUrl.origin;

  return Response.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ['header'],
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
