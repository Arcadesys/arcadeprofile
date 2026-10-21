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
}): Promise<{ id: number; sendAt: string }> {
  const payload = await kitBroadcastRequest(input, "", "POST", {
    ...kitBroadcastFields(input),
    published_at: new Date().toISOString(),
    send_at: input.sendAt,
  });
  const receipt = payload as { broadcast?: { id?: number; send_at?: unknown } };
  const broadcast = receipt.broadcast;
  if (!broadcast || !Number.isSafeInteger(broadcast.id) || (broadcast.id ?? 0) <= 0
    || typeof broadcast.send_at !== "string" || !Number.isFinite(Date.parse(broadcast.send_at))) {
    throw new Error("Kit returned an invalid broadcast receipt");
  }
  return { id: broadcast.id!, sendAt: broadcast.send_at };
}

export type KitBroadcastInput = {
  apiKey: string;
  subject: string;
  content: string;
  description: string;
  tagIds: number[];
  fetchImpl?: typeof fetch;
};

type KitConnection = Pick<KitBroadcastInput, "apiKey" | "fetchImpl">;

export function kitTagFilter(tagIds: number[]) {
  if (!tagIds.length || tagIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("Kit broadcast requires positive tag IDs.");
  }
  return [{ all: null, any: [{ type: "tag", ids: [...new Set(tagIds)] }], none: null }];
}

export function kitBroadcastFields(input: KitBroadcastInput) {
  return {
    content: input.content,
    description: input.description,
    preview_text: input.description,
    subject: input.subject,
    public: false,
    published_at: null,
    subscriber_filter: kitTagFilter(input.tagIds),
  };
}

async function kitApiRequest(
  input: KitConnection, resource: string, method: string, body?: unknown,
): Promise<unknown> {
  const response = await (input.fetchImpl ?? fetch)(`https://api.kit.com/v4/${resource}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Kit-Api-Key": input.apiKey },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  // Never include provider bodies, headers or transport errors in operator output.
  if (!response.ok) throw new Error("Kit broadcast request failed");
  return response.json();
}

async function kitBroadcastRequest(
  input: KitConnection, suffix: string, method: string, body?: unknown,
): Promise<unknown> {
  return kitApiRequest(input, `broadcasts${suffix}`, method, body);
}

export async function readKitResource(
  input: KitConnection,
  resource: 'broadcasts' | 'tags' | 'subscribers' | `broadcasts/${number}/stats`,
  query = new URLSearchParams(),
): Promise<unknown> {
  if (!/^(?:broadcasts|tags|subscribers|broadcasts\/[1-9]\d*\/stats)$/.test(resource)) {
    throw new Error("Invalid Kit read-only resource.");
  }
  const suffix = query.size ? `?${query}` : '';
  return kitApiRequest(input, `${resource}${suffix}`, "GET");
}

export async function createKitBroadcastDraft(input: KitBroadcastInput): Promise<number> {
  const payload = await kitBroadcastRequest(input, "", "POST", {
    ...kitBroadcastFields(input), send_at: null,
  }) as { broadcast?: { id?: number } };
  const id = payload?.broadcast?.id;
  if (!Number.isSafeInteger(id) || (id ?? 0) <= 0) throw new Error("Invalid Kit draft ID.");
  return id!;
}

export async function getKitBroadcast(input: KitConnection, id: number): Promise<unknown> {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid Kit broadcast ID.");
  return kitBroadcastRequest(input, `/${id}`, "GET");
}

export async function scheduleKitBroadcastDraft(
  input: KitBroadcastInput & { id: number; sendAt: string; templateId: number },
): Promise<void> {
  if (!Number.isSafeInteger(input.id) || input.id <= 0) throw new Error("Invalid Kit broadcast ID.");
  if (!Number.isSafeInteger(input.templateId) || input.templateId <= 0) throw new Error("A verified Kit template ID is required.");
  const payload = await kitBroadcastRequest(input, `/${input.id}`, "PUT", {
    ...kitBroadcastFields(input), send_at: input.sendAt, email_template_id: input.templateId,
  }) as { broadcast?: { id?: number; send_at?: string; public?: boolean; status?: unknown; email_template?: { id?: unknown } | null } };
  const broadcast = payload?.broadcast;
  // Kit can save the requested timestamp while still retaining a draft.
  // Only a sending lifecycle confirms acceptance; all other results stay pending.
  if (broadcast?.id !== input.id || broadcast.public !== false
    || broadcast.email_template?.id !== input.templateId
    || typeof broadcast.status !== "string"
    || !["scheduled", "sending", "completed"].includes(broadcast.status)
    || typeof broadcast.send_at !== "string"
    || Date.parse(broadcast.send_at) !== Date.parse(input.sendAt)) {
    throw new Error("Kit returned an invalid schedule receipt; reconcile before retrying.");
  }
}
