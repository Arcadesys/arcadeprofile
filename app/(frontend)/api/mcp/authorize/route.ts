import type { NextRequest } from 'next/server';
import {
  escapeHtml,
  generateAuthCode,
  isAllowedRedirectUri,
  safeStringEqual,
} from '@/lib/mcp-oauth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function oauthError(redirectUri: string, state: string | undefined, error: string, description: string): Response {
  // Only redirect to a validated URI — never bounce errors (which may carry a
  // code or reveal state) to an unvetted destination.
  if (isAllowedRedirectUri(redirectUri)) {
    try {
      const url = new URL(redirectUri);
      url.searchParams.set('error', error);
      url.searchParams.set('error_description', description);
      if (state) url.searchParams.set('state', state);
      return Response.redirect(url.toString(), 302);
    } catch {
      // fall through to plain response
    }
  }
  return new Response(`${error}: ${description}`, { status: 400 });
}

// GET — render the confirmation page
export async function GET(req: NextRequest): Promise<Response> {
  const p = req.nextUrl.searchParams;
  const clientId = p.get('client_id') ?? '';
  const redirectUri = p.get('redirect_uri') ?? '';
  const codeChallenge = p.get('code_challenge') ?? '';
  const codeChallengeMethod = p.get('code_challenge_method') ?? 'S256';
  const state = p.get('state') ?? '';
  const responseType = p.get('response_type') ?? 'code';

  if (responseType !== 'code') {
    return new Response('unsupported_response_type', { status: 400 });
  }
  if (!clientId || !redirectUri || !codeChallenge) {
    return new Response('invalid_request: missing required parameters', { status: 400 });
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return new Response('invalid_request: redirect_uri is not allowed', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize MCP Access — The Arcades</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,.08);
      padding: 2rem;
      max-width: 400px;
      width: 100%;
    }
    h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
    p { color: #555; font-size: .875rem; margin: 0 0 1rem; line-height: 1.5; }
    .client-id {
      font-family: monospace;
      font-size: .8rem;
      background: #f3f4f6;
      padding: .2rem .5rem;
      border-radius: 4px;
      word-break: break-all;
    }
    label { display: block; font-size: .8125rem; font-weight: 600; margin-bottom: .375rem; margin-top: 1rem; }
    input[type=password] {
      width: 100%;
      padding: .5rem .75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      outline: none;
    }
    input[type=password]:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
    .actions { display: flex; gap: .75rem; margin-top: 1.25rem; }
    button {
      flex: 1;
      padding: .625rem;
      border: none;
      border-radius: 8px;
      font-size: .9375rem;
      font-weight: 600;
      cursor: pointer;
    }
    .allow { background: #6366f1; color: white; }
    .allow:hover { background: #4f46e5; }
    .deny { background: #f3f4f6; color: #374151; }
    .deny:hover { background: #e5e7eb; }
    .error { color: #dc2626; font-size: .8125rem; margin-top: .5rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize MCP Access</h1>
    <p>An MCP client wants to connect to <strong>The Arcades</strong> server.</p>
    <p>Client: <span class="client-id">${escapeHtml(clientId)}</span></p>
    <form method="POST">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autofocus required autocomplete="current-password" />
      <div class="actions">
        <button type="submit" name="action" value="allow" class="allow">Allow</button>
        <button type="submit" name="action" value="deny" class="deny">Deny</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// POST — validate password and issue auth code
export async function POST(req: NextRequest): Promise<Response> {
  const form = await req.formData();
  const clientId = (form.get('client_id') as string) ?? '';
  const redirectUri = (form.get('redirect_uri') as string) ?? '';
  const codeChallenge = (form.get('code_challenge') as string) ?? '';
  const codeChallengeMethod = (form.get('code_challenge_method') as string) ?? 'S256';
  const state = (form.get('state') as string) || undefined;
  const action = (form.get('action') as string) ?? 'allow';
  const password = (form.get('password') as string) ?? '';

  if (!clientId || !redirectUri || !codeChallenge) {
    return new Response('invalid_request', { status: 400 });
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return new Response('invalid_request: redirect_uri is not allowed', { status: 400 });
  }

  if (action === 'deny') {
    return oauthError(redirectUri, state, 'access_denied', 'User denied the request');
  }

  const authorizePassword = process.env.MCP_AUTHORIZE_PASSWORD;
  const mcpApiKey = process.env.MCP_API_KEY;

  if (!mcpApiKey || !authorizePassword) {
    return oauthError(redirectUri, state, 'server_error', 'Server is not configured');
  }

  if (!safeStringEqual(password, authorizePassword)) {
    return oauthError(redirectUri, state, 'access_denied', 'Invalid password');
  }

  const code = generateAuthCode(
    {
      codeChallenge,
      codeChallengeMethod,
      clientId,
      redirectUri,
      state,
      exp: Date.now() + 10 * 60 * 1000,
    },
    mcpApiKey,
  );

  const url = new URL(redirectUri);
  url.searchParams.set('code', code);
  if (state) url.searchParams.set('state', state);
  return Response.redirect(url.toString(), 302);
}
