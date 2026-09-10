import type { Audience, SubscriptionUpdateMode } from "./subscribe-types";
async function request(
  path: string,
  body: unknown,
  scope: "subscribe" | "admin",
) {
  const base = process.env.EMAIL_SERVICE_URL;
  const key =
    process.env[
      scope === "subscribe"
        ? "EMAIL_SERVICE_SUBSCRIBE_KEY"
        : "EMAIL_SERVICE_ADMIN_KEY"
    ];
  if (!base || !key) throw new Error("Email service is not configured");
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Email service requires HTTPS");
  const response = await fetch(new URL(path, url), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(scope === "subscribe" ? 15000 : 300000),
  });
  if (!response.ok) throw new Error("Email service request failed");
  return response.json() as Promise<unknown>;
}
export async function subscribeViaEmailService(input: {
  email: string;
  audiences: Audience[];
  updateMode: SubscriptionUpdateMode;
  source?: string;
}) {
  const { z } = await import("zod");
  return z
    .object({
      ok: z.literal(true),
      audiences: z.array(z.enum(["all", "fiction", "essays", "lab"])),
      suppressed: z.boolean(),
    })
    .parse(
      await request(
        "/v1/subscribers",
        {
          ...input,
          source: input.source ?? "site",
          policy: "writing-updates-v1",
        },
        "subscribe",
      ),
    );
}
export async function deliverViaEmailService(
  kind: "broadcasts" | "transactional",
  input: {
    id: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    to?: string;
    audiences?: Audience[];
    publicationKey?: string;
    resendReason?: string;
  },
) {
  const { z } = await import("zod");
  const result = z
    .object({ status: z.string(), result: z.unknown() })
    .parse(await request(`/v1/${kind}`, input, "admin"));
  if (result.status !== "accepted")
    throw new Error(
      `Delivery ${result.status}; review the service job before retrying`,
    );
  return result;
}
