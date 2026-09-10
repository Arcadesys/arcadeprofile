import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { email } from "./contracts.js";
import type { Store } from "./store.js";
export function validSignature(
  raw: string,
  header: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = header.split(",").map((p) => p.trim());
  const stamps = parts.filter((p) => p.startsWith("t="));
  if (stamps.length !== 1) return false;
  const timestamp = stamps[0].slice(2);
  if (
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !secret
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  return parts
    .filter((p) => p.startsWith("v1="))
    .some(
      (p) =>
        p.length === 67 &&
        timingSafeEqual(Buffer.from(p.slice(3)), Buffer.from(expected)),
    );
}
const envelope = z.object({
  events: z
    .array(
      z.object({
        id: z.string().uuid(),
        type: z.string(),
        created: z.iso.datetime(),
        data: z.unknown(),
      }),
    )
    .min(1)
    .max(100),
});
const reasons = {
  "subscriber.unsubscribed": "unsubscribed",
  "subscriber.bounced": "bounced",
  "subscriber.complained": "complained",
} as const;
export function ingestKit(store: Store, body: unknown) {
  // Validate the entire batch before acknowledging any events.
  const events = envelope.parse(body).events.map((event) => {
    const reason = reasons[event.type as keyof typeof reasons];
    const data = reason
      ? z
          .object({ subscriber: z.object({ email_address: email }) })
          .parse(event.data)
      : null;
    return { ...event, reason, email: data?.subscriber.email_address };
  });
  for (const event of events)
    store.event(`kit:${event.id}`, () => {
      if (event.reason && event.email)
        store.suppress(event.email, event.reason, "kit", event.created);
    });
}
export function ingestPostmark(store: Store, body: unknown) {
  const event = z
    .object({
      RecordType: z.enum(["Bounce", "SpamComplaint", "SubscriptionChange"]),
      Email: email.optional(),
      Recipient: email.optional(),
      ID: z.union([z.string(), z.number()]).optional(),
      MessageID: z.string().nullable().optional(),
      Type: z.string().optional(),
      SuppressSending: z.boolean().optional(),
      SuppressionReason: z.string().nullable().optional(),
      Origin: z.string().optional(),
      ChangedAt: z.string().optional(),
    })
    .parse(body);
  const address = event.Email ?? event.Recipient;
  if (!address) throw new Error("Missing event recipient");
  const reason =
    event.RecordType === "SpamComplaint"
      ? "complained"
      : event.RecordType === "Bounce" &&
          ["HardBounce", "SpamComplaint"].includes(event.Type ?? "")
        ? event.Type === "SpamComplaint"
          ? "complained"
          : "bounced"
        : event.RecordType === "SubscriptionChange" && event.SuppressSending
          ? event.SuppressionReason === "HardBounce"
            ? "bounced"
            : event.SuppressionReason === "SpamComplaint"
              ? "complained"
              : event.Origin === "Recipient"
                ? "unsubscribed"
                : "manual"
          : null;
  if (reason)
    store.suppress(
      address,
      reason,
      "postmark",
      event.ChangedAt ?? new Date().toISOString(),
    );
}
