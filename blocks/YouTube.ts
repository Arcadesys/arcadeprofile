import type { Block } from 'payload';

const VIDEO_ID_RE = /^[\w-]{11}$/;

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (VIDEO_ID_RE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      return VIDEO_ID_RE.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && VIDEO_ID_RE.test(v)) return v;
      const m = url.pathname.match(/^\/(?:embed|shorts|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

export const YouTubeBlock: Block = {
  slug: 'youtube',
  interfaceName: 'YouTubeBlock',
  fields: [
    {
      name: 'videoId',
      type: 'text',
      required: true,
      admin: {
        description: 'YouTube video id (the 11-char string after v= or youtu.be/). Pasting a full URL also works.',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value !== 'string') return value;
            const id = extractVideoId(value);
            return id ?? value;
          },
        ],
      },
    },
    {
      name: 'caption',
      type: 'text',
      required: false,
    },
  ],
  jsx: {
    export: ({ fields }) => {
      const props: Record<string, string> = { id: String(fields.videoId ?? '') };
      if (fields.caption) props.caption = String(fields.caption);
      return { props };
    },
    import: ({ props }) => {
      const id = extractVideoId(String(props.id ?? '')) ?? String(props.id ?? '');
      if (!id) return false;
      const fields: Record<string, unknown> = { videoId: id };
      if (typeof props.caption === 'string' && props.caption) fields.caption = props.caption;
      return fields;
    },
  },
};
