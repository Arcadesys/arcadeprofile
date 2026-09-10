import { z } from "zod";
export const email = z.string().trim().toLowerCase().email().max(254);
export const audience = z.enum(["all", "fiction", "essays", "lab"]);
export const subscription = z
  .object({
    email,
    audiences: z.array(audience).min(1).max(4),
    updateMode: z.enum(["add", "replace"]),
    source: z.string().min(1).max(100),
    policy: z.literal("writing-updates-v1"),
  })
  .strict();
export const message = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1).max(300),
  htmlBody: z.string().min(1).max(500000),
  textBody: z.string().min(1).max(500000),
});
export const broadcast = message
  .extend({
    audiences: z.array(audience).min(1).max(4),
    publicationKey: z.string().min(1).max(200),
    resendReason: z.string().trim().min(1).max(1000).optional(),
  })
  .strict();
export const transactional = message.extend({ to: email }).strict();
export type Subscription = z.infer<typeof subscription>;
export type Broadcast = z.infer<typeof broadcast>;
export type Transactional = z.infer<typeof transactional>;
export type Suppression = "unsubscribed" | "bounced" | "complained" | "manual";
