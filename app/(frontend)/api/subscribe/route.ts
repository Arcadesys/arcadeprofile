import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { subscribeToKitForms } from "@/lib/kit";
import { logger } from "@/lib/logger";
import {
  VALID_AUDIENCES,
  VALID_SOURCES,
  VALID_MAGNETS,
  VALID_UPDATE_MODES,
  type Magnet,
} from "@/lib/subscribe-types";
import { parseBody } from "@/lib/validation";

const MAGNETS: Record<
  Magnet,
  { files: Array<{ url: string; filename: string; label: string }> }
> = {
  story: {
    files: [
      {
        url: "/lead-magnets/la-ligne-du-marais.pdf",
        filename: "la-ligne-du-marais.pdf",
        label: "PDF",
      },
      {
        url: "/lead-magnets/la-ligne-du-marais.epub",
        filename: "la-ligne-du-marais.epub",
        label: "EPUB",
      },
    ],
  },
  "it-takes-a-zoo-complete": {
    files: [
      {
        url: "/novels/it-takes-a-zoo/complete/pdf",
        filename: "it-takes-a-zoo-complete.pdf",
        label: "Complete PDF",
      },
    ],
  },
};

const subscribeSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Email must be a valid address."),
  audiences: z
    .array(z.enum(VALID_AUDIENCES))
    .min(
      1,
      "Pick at least one list (All, Fiction, Essays, or The Arcades' Lab & build logs).",
    )
    .transform((val) => [...new Set(val)]),
  source: z.enum(VALID_SOURCES).optional(),
  magnet: z.enum(VALID_MAGNETS).optional(),
  updateMode: z.enum(VALID_UPDATE_MODES).default("replace"),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(subscribeSchema, request);
  if (!parsed.ok) return parsed.response;

  const { email, audiences, source, magnet } = parsed.data;

  let result: Awaited<ReturnType<typeof subscribeToKitForms>>;
  try {
    result = await subscribeToKitForms({
      email,
      audiences,
    });
  } catch {
    logger.error("[subscribe] Kit form request failed");
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again." },
      { status: 502 },
    );
  }

  // Surface attribution in logs so we can answer "which page is converting?"
  // without an analytics roundtrip. Email is intentionally omitted.
  console.log(
    "[subscribe] Kit form memberships requested",
    JSON.stringify({
      source: source ?? null,
      magnet: magnet ?? null,
      submitted: result.submitted,
      failed: result.failed,
    }),
  );

  if (result.failed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        partial: true,
        submitted: result.submitted,
        failed: result.failed,
        confirmationRequired: true,
        error: result.blockedActiveSubscriber
          ? "This address is already active in Kit. We did not add the selected preferences because Kit cannot request a separate confirmation for an already-active subscriber."
          : "Some preferences could not be submitted. Check the failed preferences and try again.",
        ...(magnet ? { magnet: MAGNETS[magnet] } : {}),
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    ok: true,
    subscribed: result.submitted,
    confirmationRequired: true,
    ...(magnet ? { magnet: MAGNETS[magnet] } : {}),
  });
}
