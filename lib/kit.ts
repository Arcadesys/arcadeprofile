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

export async function subscribeToKitForms(input: {
  email: string;
  audiences: Audience[];
  fetchImpl?: typeof fetch;
}): Promise<Audience[]> {
  const apiSecret = process.env.KIT_API_SECRET?.trim();
  if (!apiSecret) throw new Error("Kit API is not configured");
  const fetchImpl = input.fetchImpl ?? fetch;

  // Kit's form subscribe endpoint follows the form's double opt-in setting.
  // Each preference is represented by its own form so automations can apply
  // audience tags only after the subscriber confirms.
  for (const audience of input.audiences) {
    const response = await fetchImpl(
      `https://api.convertkit.com/v3/forms/${formId(audience)}/subscribe`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_secret: apiSecret,
          email: input.email,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) throw new Error("Kit form subscription failed");
  }
  return input.audiences;
}
