'use client';

import PostGunEditor from '../PostGunEditor';

export default function EditPostPage({ params }: { params: { slug: string } }) {
  // "new" slug is handled by /admin/editor/new route, but catch it here too
  if (params.slug === 'new') {
    return <PostGunEditor slug={null} />;
  }
  return <PostGunEditor slug={params.slug} />;
}
