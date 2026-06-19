export interface GroupSceneColumnInput {
  chapterSlug: string | null;
  postIds: string[];
}

export interface ExistingGroupScene {
  id: string | number;
  chapter?: string | null;
  order?: number | null;
}

export interface GroupSceneOrderUpdate {
  id: string;
  chapter: string | null;
  order: number;
}

export function resolveGroupSceneOrderUpdates(
  columns: GroupSceneColumnInput[],
  existingScenes: ExistingGroupScene[],
): GroupSceneOrderUpdate[] {
  const existingById = new Map(existingScenes.map((scene) => [String(scene.id), scene]));
  const updates: GroupSceneOrderUpdate[] = [];
  let nextOrder = 0;

  for (const column of columns) {
    for (const postId of column.postIds) {
      const id = String(postId);
      const current = existingById.get(id);
      if (!current) {
        nextOrder += 1;
        continue;
      }

      const chapter = column.chapterSlug;
      const order = nextOrder;
      nextOrder += 1;

      if ((current.chapter ?? null) === chapter && current.order === order) {
        continue;
      }

      updates.push({ id, chapter, order });
    }
  }

  return updates;
}
