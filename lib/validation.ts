import { NextResponse } from 'next/server';
import type { ZodType, z } from 'zod';

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * Returns either { ok: true, data } for callers to use, or
 * { ok: false, response } that the route handler should return as-is —
 * a 400 with structured `{ error, issues }` for invalid JSON or schema
 * violations.
 */
export async function parseBody<S extends ZodType>(
  schema: S,
  request: Request,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Invalid request body',
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: result.data };
}
