import { getPayload } from 'payload';
import configPromise from '@payload-config';
import type { Book, Demo, Project } from '@/payload-types';

async function getPayloadClient() {
  return getPayload({ config: configPromise });
}

export async function getAllBooks(): Promise<Book[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'books',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}

export async function getAllDemos(): Promise<Demo[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'demos',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}

export async function getDemoBySlug(slug: string): Promise<Demo | null> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'demos',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  return result.docs[0] ?? null;
}

export async function getAllProjects(): Promise<Project[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'projects',
    limit: 100,
    depth: 0,
  });
  return result.docs;
}
