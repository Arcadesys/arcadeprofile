import { createHash } from "node:crypto";

export const KIT_ESSAY_TAG_ENV = [
  "KIT_TAG_ALL_WRITING_ID",
  "KIT_TAG_ESSAYS_ID",
] as const;

export function getEssayTagIds(env: Record<string, string | undefined> = process.env): number[] {
  const ids = KIT_ESSAY_TAG_ENV.map((name) => {
    const value = env[name]?.trim();
    if (!value || !/^\d+$/.test(value)) {
      throw new Error(`Kit newsletter audience is missing ${name}`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new Error(`Kit newsletter audience has an invalid ${name}`);
    }
    return parsed;
  });
  return [...new Set(ids)];
}

export function hashTagAudience(ids: readonly number[]): string {
  return createHash("sha256")
    .update([...new Set(ids)].sort((a, b) => a - b).join(","))
    .digest("hex");
}

export async function createAndScheduleKitBroadcast(input: {
  apiKey: string;
  subject: string;
  content: string;
  description: string;
  tagIds: number[];
  sendAt: string;
  fetchImpl?: typeof fetch;
}): Promise<{ id: number; sendAt: string | null }> {
  const response = await (input.fetchImpl ?? fetch)(
    "https://api.kit.com/v4/broadcasts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": input.apiKey,
      },
      body: JSON.stringify({
        content: input.content,
        description: input.description,
        public: false,
        published_at: new Date().toISOString(),
        preview_text: input.description,
        subject: input.subject,
        send_at: input.sendAt,
        subscriber_filter: [
          {
            all: null,
            any: [{ type: "tag", ids: input.tagIds }],
            none: null,
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) throw new Error("Kit broadcast request failed");
  const payload = (await response.json()) as {
    broadcast?: { id?: number; send_at?: string | null };
  };
  const broadcast = payload.broadcast;
  if (!broadcast || !Number.isSafeInteger(broadcast.id)) {
    throw new Error("Kit returned an invalid broadcast receipt");
  }
  return { id: broadcast.id!, sendAt: broadcast.send_at ?? null };
}
