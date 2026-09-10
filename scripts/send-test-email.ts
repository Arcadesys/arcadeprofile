import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { deliverViaEmailService } from "../lib/email-service";
config({ path: ".env.local" });
const to = process.argv[2];
if (!to) throw new Error("Pass an explicit test recipient.");
await deliverViaEmailService("transactional", {
  id: randomUUID(),
  to,
  subject: "Email service test",
  htmlBody: "<p>Email service test.</p>",
  textBody: "Email service test.",
});
console.log("Test accepted by email service.");
