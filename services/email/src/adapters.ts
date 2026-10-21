import { readMailConfig, sendMail } from '../../../lib/mail-transport.js';
import { z } from "zod";
import type { Broadcast, Transactional, Suppression } from "./contracts.js";
export interface NewsletterAdapter {
  prepare(
    id: string,
    emails: string[],
    suppressed: (email: string, reason: Suppression) => void,
  ): Promise<{ tagId: number; eligible: string[] }>;
  send(input: Broadcast, tagId: number): Promise<{ providerId: string }>;
}
export class KitAdapter implements NewsletterAdapter {
  constructor(
    private key: string,
    private from: string,
    private fetchImpl: typeof fetch = fetch,
  ) {}
  private async request(path: string, body: unknown) {
    const response = await this.fetchImpl(`https://api.kit.com/v4/${path}`, {
      method: "POST",
      headers: {
        "X-Kit-Api-Key": this.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`Kit request failed (${response.status})`);
    return response.json() as Promise<unknown>;
  }
  async prepare(
    id: string,
    emails: string[],
    suppress: (email: string, reason: Suppression) => void,
  ) {
    const { tag } = z
      .object({ tag: z.object({ id: z.number().int().positive() }) })
      .parse(await this.request("tags", { name: `arcades-send-${id}` }));
    const eligible: string[] = [];
    for (const email of emails) {
      const { subscriber } = z
        .object({
          subscriber: z.object({
            id: z.number().int().positive(),
            state: z.enum([
              "active",
              "inactive",
              "cancelled",
              "bounced",
              "complained",
            ]),
          }),
        })
        .parse(
          await this.request("subscribers", {
            email_address: email,
            state: "active",
          }),
        );
      if (subscriber.state !== "active") {
        suppress(
          email,
          subscriber.state === "bounced" || subscriber.state === "complained"
            ? subscriber.state
            : "unsubscribed",
        );
        continue;
      }
      await this.request(`tags/${tag.id}/subscribers/${subscriber.id}`, {});
      eligible.push(email);
    }
    return { tagId: tag.id, eligible };
  }
  async send(input: Broadcast, tagId: number) {
    if (!Number.isSafeInteger(tagId) || tagId <= 0)
      throw new Error("An exclusive recipient tag is required");
    const result = z
      .object({ broadcast: z.object({ id: z.number().int().positive() }) })
      .parse(
        await this.request("broadcasts", {
          subject: input.subject,
          content: input.htmlBody,
          description: `arcades:${input.id}`,
          email_address: this.from,
          public: false,
          published_at: null,
          preview_text: "",
          send_at: new Date().toISOString(),
          subscriber_filter: [{ all: [{ type: "tag", ids: [tagId] }] }],
        }),
      );
    return { providerId: String(result.broadcast.id) };
  }
}
export function transactionalMailConfig(env: Record<string, string | undefined> = process.env) {
  // The legacy service historically used EMAIL_FROM for Postmark.
  return readMailConfig({ ...env, POSTMARK_FROM_EMAIL: env.EMAIL_FROM ?? env.POSTMARK_FROM_EMAIL, POSTMARK_FROM_NAME: undefined });
}
export async function transactionalMail(
  input: Transactional,
  fetchImpl: typeof fetch = fetch,
  env: Record<string, string | undefined> = process.env,
) {
  const providerId = await sendMail({
    to: input.to, subject: input.subject, html: input.htmlBody, text: input.textBody,
    category: 'legacy-transactional', metadata: { service_request: input.id },
    idempotencyKey: `service-request/${input.id}`, timeoutMs: 30000,
  }, { fetcher: fetchImpl, config: transactionalMailConfig(env) });
  return { providerId };
}
