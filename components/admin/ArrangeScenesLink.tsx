'use client';

import { useFormFields } from '@payloadcms/ui';

export default function ArrangeScenesLink() {
  const slug = useFormFields(([fields]) => {
    const v = fields?.slug?.value;
    return typeof v === 'string' ? v : '';
  });

  const href = slug ? `/admin/group-scenes?group=${encodeURIComponent(slug)}` : '';

  return (
    <div
      className="field-type"
      style={{
        marginBottom: '1.25rem',
        padding: '0.85rem 1rem',
        border: '1px solid var(--theme-elevation-150, #e4e4e7)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50, #fafafa)',
      }}
    >
      <label
        className="field-label"
        style={{
          display: 'block',
          marginBottom: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      >
        Arrange scenes
      </label>
      {href ? (
        <>
          <a
            href={href}
            className="btn btn--style-primary btn--size-small"
            style={{
              display: 'inline-block',
              padding: '0.45rem 0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Open scene board →
          </a>
          <p
            className="field-description"
            style={{
              marginTop: 8,
              marginBottom: 0,
              fontSize: '0.75rem',
              color: 'var(--theme-elevation-500, #777)',
              lineHeight: 1.4,
            }}
          >
            Drag posts in this group between chapter columns. Add chapters below first if you haven't yet.
          </p>
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--theme-elevation-500, #777)',
          }}
        >
          Save this group with a slug to enable the scene board.
        </p>
      )}
    </div>
  );
}
