export async function sendPreview(input: {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? process.env;
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(input.to)) {
    throw new Error("Preview requires exactly one explicit email address.");
  }
  const token = env.POSTMARK_SERVER_TOKEN?.trim();
  const from = env.POSTMARK_FROM_EMAIL?.trim();
  if (!token || !from) throw new Error("Postmark preview is not configured.");
  const response = await (input.fetchImpl ?? fetch)("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      From: env.POSTMARK_FROM_NAME?.trim()
        ? `${env.POSTMARK_FROM_NAME.trim()} <${from}>`
        : from,
      To: input.to,
      Subject: `[Preview] ${input.subject}`,
      HtmlBody: input.htmlBody,
      TextBody: input.textBody,
      MessageStream: env.POSTMARK_TRANSACTIONAL_STREAM?.trim() || "outbound",
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("Postmark preview request failed.");
  const result = await response.json() as { ErrorCode?: number };
  if (result.ErrorCode !== 0) throw new Error("Postmark preview was not accepted.");
}
