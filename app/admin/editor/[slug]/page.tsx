'use client';

import { use } from 'react';
import PostGunEditor from '../PostGunEditor';

export default function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  if (slug === 'new') {
    return <PostGunEditor slug={null} />;
  }
  return <PostGunEditor slug={slug} />;
}
