import { RichText } from '@payloadcms/richtext-lexical/react';
import type { SerializedEditorState } from 'lexical';

type Props = { data: SerializedEditorState };

export default function PostRichText({ data }: Props) {
  return (
    <RichText
      data={data}
      converters={({ defaultConverters }) => ({
        ...defaultConverters,
        blocks: {
          youtube: ({ node }: { node: { fields?: { videoId?: string; caption?: string } } }) => {
            const fields = node.fields ?? {};
            const id = fields.videoId;
            if (!id) return null;
            const src = `https://www.youtube-nocookie.com/embed/${id}`;
            return (
              <figure className="youtube-embed" style={{ margin: '2rem 0' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  <iframe
                    src={src}
                    title={fields.caption ?? 'YouTube video player'}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                </div>
                {fields.caption && (
                  <figcaption
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--fg-muted)',
                      marginTop: '0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    {fields.caption}
                  </figcaption>
                )}
              </figure>
            );
          },
        },
      })}
    />
  );
}
