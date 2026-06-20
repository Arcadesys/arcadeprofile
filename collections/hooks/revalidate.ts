import type { CollectionAfterChangeHook, Payload } from 'payload';

export type RevalidationDoc = Record<string, unknown>;

type PathBuilder = (
  doc: RevalidationDoc,
  payload: Payload,
  previousDoc?: RevalidationDoc,
) => string[] | Promise<string[]>;

export function uniqueRevalidationPaths(paths: string[]): string[] {
  return Array.from(new Set(paths.filter((path) => path.length > 0)));
}

export function revalidatePathsFor(buildPaths: PathBuilder): CollectionAfterChangeHook {
  return async ({ doc, previousDoc, req }) => {
    let paths: string[] = [];
    try {
      paths = uniqueRevalidationPaths(
        await Promise.resolve(buildPaths(doc, req.payload, previousDoc)),
      );
    } catch (err) {
      console.error('[revalidate] path builder threw:', err);
      return;
    }

    try {
      const { revalidatePath } = await import('next/cache');
      for (const path of paths) {
        try {
          revalidatePath(path);
        } catch {
          // revalidatePath may fail outside request context.
        }
      }
    } catch {
      // next/cache import can fail in non-Next contexts (tests, scripts).
    }
  };
}
