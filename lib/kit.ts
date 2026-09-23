import type { Audience } from "./subscribe-types";

const FORM_ENV: Record<Audience, string> = {
  all: "KIT_FORM_ALL_ID",
  fiction: "KIT_FORM_FICTION_ID",
  essays: "KIT_FORM_ESSAYS_ID",
  lab: "KIT_FORM_LAB_ID",
};

function formId(audience: Audience): string {
  const value = process.env[FORM_ENV[audience]]?.trim();
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`Kit form is not configured for ${audience}`);
  }
  return value;
}

export type KitFormSubmission = { submitted: Audience[]; failed: Audience[]; blockedActiveSubscriber?: boolean };

export async function subscribeToKitForms(input: {
  email: string;
  audiences: Audience[];
  fetchImpl?: typeof fetch;
}): Promise<KitFormSubmission> {
  const apiKey = process.env.KIT_API_KEY?.trim();
  if (!apiKey) throw new Error("Kit API is not configured");
  // Validate every selected form before creating a subscriber. Otherwise a
  // missing later form could leave a partial request that the UI cannot report.
  const selectedForms = input.audiences.map((audience) => ({ audience, id: formId(audience) }));
  const fetchImpl = input.fetchImpl ?? fetch;
  const headers = { "Content-Type": "application/json", "X-Kit-Api-Key": apiKey };

  const createResponse = await fetchImpl("https://api.kit.com/v4/subscribers", {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: input.email.trim().toLowerCase(), state: "inactive" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!createResponse.ok) throw new Error("Kit subscriber creation failed");
  const createPayload = await createResponse.json() as { subscriber?: { id?: number; state?: string } };
  const subscriberId = createPayload.subscriber?.id;
  if (!Number.isSafeInteger(subscriberId) || (subscriberId ?? 0) <= 0) {
    throw new Error("Kit returned an invalid subscriber receipt");
  }
  // Kit treats an already-active subscriber as opted in account-wide and may
  // add them to another double-opt-in form without a new confirmation. Fail
  // closed instead of treating that form membership as fresh consent.
  if (createPayload.subscriber?.state !== "inactive") {
    return { submitted: [], failed: input.audiences, blockedActiveSubscriber: true };
  }

  // Each preference has its own double-opt-in form and confirmation. A
  // membership request failure does not undo or hide other successful forms.
  const results = await Promise.all(selectedForms.map(async ({ audience, id }) => {
    try {
      const response = await fetchImpl(`https://api.kit.com/v4/forms/${id}/subscribers/${subscriberId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      });
      return { audience, ok: response.ok };
    } catch {
      return { audience, ok: false };
    }
  }));
  return {
    submitted: results.filter((result) => result.ok).map(({ audience }) => audience),
    failed: results.filter((result) => !result.ok).map(({ audience }) => audience),
  };
}
