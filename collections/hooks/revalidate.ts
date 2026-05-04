import type { CollectionAfterChangeHook, Payload } from 'payload';

type PathBuilder = (
  doc: Record<string, unknown>,
  payload: Payload,
) => string[] | Promise<string[]>;

export function revalidatePathsFor(buildPaths: PathBuilder): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    let paths: string[] = [];
    try {
      paths = await Promise.resolve(buildPaths(doc, req.payload));
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
