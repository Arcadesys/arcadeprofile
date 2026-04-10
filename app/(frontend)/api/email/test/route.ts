import { authorizeCronRequest } from '@/lib/cronAuth';
import { handleEmailTestRequest } from '@/lib/email-test-handler';
import { sendPostmarkTestEmail } from '@/lib/postmark';

async function handleRequest(request: Request) {
  return handleEmailTestRequest(request, {
    authorizeCronRequest,
    sendPostmarkTestEmail,
  });
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
