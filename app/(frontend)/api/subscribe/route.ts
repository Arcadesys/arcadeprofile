import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { subscribeViaEmailService } from "@/lib/email-service";
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

  const { email, audiences, source, magnet, updateMode } = parsed.data;

  let subscribed: string[];
  try {
    const result = await subscribeViaEmailService({
      email,
      audiences,
      source,
      updateMode,
    });
    if (result.suppressed) {
      return NextResponse.json(
        {
          error:
            "This address cannot receive updates. Contact us for help with your subscription.",
        },
        { status: 409 },
      );
    }
    subscribed = result.audiences;
  } catch {
    logger.error("[subscribe] Email service request failed");
    return NextResponse.json(
      { error: "Could not subscribe right now. Please try again." },
      { status: 502 },
    );
  }

  // Surface attribution in logs so we can answer "which page is converting?"
  // without an analytics roundtrip. Email is intentionally omitted.
  console.log(
    "[subscribe] ok",
    JSON.stringify({
      source: source ?? null,
      magnet: magnet ?? null,
      updateMode,
    }),
  );

  return NextResponse.json({
    ok: true,
    subscribed,
    ...(magnet ? { magnet: MAGNETS[magnet] } : {}),
  });
}
