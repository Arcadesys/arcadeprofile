import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

const DEFAULT_FROM_EMAIL = 'austen@thearcades.me';
const DEFAULT_FROM_NAME = 'The Arcades';

function getPostmarkToken(): string | undefined {
  return process.env.POSTMARK_SERVER_TOKEN;
}

export function createPayloadEmailAdapter() {
  const postmarkToken = getPostmarkToken();

  if (!postmarkToken) {
    const enforceInProd = process.env.POSTMARK_REQUIRED_IN_PROD === 'true';

    if (process.env.NODE_ENV === 'production' && enforceInProd) {
      throw new Error(
        'Missing POSTMARK_SERVER_TOKEN while POSTMARK_REQUIRED_IN_PROD=true. Payload email cannot start without Postmark.',
      );
    }

    console.warn(
      '[payload-email] POSTMARK_SERVER_TOKEN is not set. Payload email is disabled. Set POSTMARK_REQUIRED_IN_PROD=true to enforce this at boot in production.',
    );

    return undefined;
  }

  return nodemailerAdapter({
    defaultFromAddress: process.env.POSTMARK_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    defaultFromName: process.env.POSTMARK_FROM_NAME || DEFAULT_FROM_NAME,
    skipVerify: true,
    transportOptions: {
      host: 'smtp.postmarkapp.com',
      port: 587,
      secure: false,
      auth: {
        user: postmarkToken,
        pass: postmarkToken,
      },
    },
  });
}
