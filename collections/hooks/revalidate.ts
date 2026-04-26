import type { CollectionAfterChangeHook } from 'payload';

type PathBuilder = (doc: Record<string, unknown>) => string[];

export function revalidatePathsFor(buildPaths: PathBuilder): CollectionAfterChangeHook {
  return ({ doc }) => {
    import('next/cache')
      .then(({ revalidatePath }) => {
        try {
          for (const path of buildPaths(doc)) {
            revalidatePath(path);
          }
        } catch {
          // revalidatePath may fail outside request context.
        }
      })
      .catch(() => {});
  };
}
