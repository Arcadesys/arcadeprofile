import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import type { PayloadEmailAdapter, SendEmailOptions } from 'payload';

const DEFAULT_FROM_EMAIL = 'austen@thearcades.me';
const DEFAULT_FROM_NAME = 'The Arcades';

declare global {
  var __payloadEmailWarningShown: boolean | undefined;
}

function getPostmarkToken(): string | undefined {
  return process.env.POSTMARK_SERVER_TOKEN;
}

const fallbackEmailAdapter: PayloadEmailAdapter<void> = ({ payload }) => ({
  name: 'console',
  defaultFromAddress: process.env.POSTMARK_FROM_EMAIL || DEFAULT_FROM_EMAIL,
  defaultFromName: process.env.POSTMARK_FROM_NAME || DEFAULT_FROM_NAME,
  sendEmail: async (message: SendEmailOptions) => {
    const recipients = [message.to, message.cc, message.bcc]
      .flat()
      .filter(Boolean)
      .join(', ');

    payload.logger.info({
      msg: `[payload-email] Email skipped because Postmark is not configured. To: '${recipients}', Subject: '${message.subject ?? ''}'`,
    });

    return Promise.resolve();
  },
});

function warnMissingPostmarkTokenOnce() {
  if (globalThis.__payloadEmailWarningShown) {
    return;
  }

  globalThis.__payloadEmailWarningShown = true;

  console.warn(
    '[payload-email] POSTMARK_SERVER_TOKEN is not set. Using the console email adapter in development. Set POSTMARK_REQUIRED_IN_PROD=true to enforce this at boot in production.',
  );
}

export function createPayloadEmailAdapter(): PayloadEmailAdapter<void> | ReturnType<typeof nodemailerAdapter> {
  const postmarkToken = getPostmarkToken();

  if (!postmarkToken) {
    const enforceInProd = process.env.POSTMARK_REQUIRED_IN_PROD === 'true';

    if (process.env.NODE_ENV === 'production' && enforceInProd) {
      throw new Error(
        'Missing POSTMARK_SERVER_TOKEN while POSTMARK_REQUIRED_IN_PROD=true. Payload email cannot start without Postmark.',
      );
    }

    warnMissingPostmarkTokenOnce();

    return fallbackEmailAdapter;
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
