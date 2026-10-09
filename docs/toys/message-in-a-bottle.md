# Message in a Bottle release

The Toy landing page is `/toys/message-in-a-bottle`; its current illustrated module is `/toys/message-in-a-bottle/guide.html`. There is no separate campaign Vercel project or hosted MCP endpoint.

The public guide is a vendored edition of `Arcadesys/message-in-a-bottle` at the commit recorded in `data/toys/message-in-a-bottle-release.json`. Campaign prose and optional mechanics are preserved. Site-specific additions are canonical/share metadata, a back link, Blob image URLs, and offline-download/MCP setup cards. CSS, script, encounter reference, stat blocks and reuse licenses are copied alongside it. Required Pinnacle fan logo and notice remain intact.

For updates, review the source repository’s `app/illustrated-guide` changes and copy only approved public release files. Keep provenance hashes current. Upload images using `npm run upload:image`; ZIP downloads are content-addressed in Blob, with URL, SHA-256 and size recorded in the release manifest. Preserve offline ZIP images and local links. Do not copy live GM saves, private campaign correspondence, source-project mirrors, or MCP dependencies into public assets.

The optional MCP companion is installed from the source repository in a compatible local stdio client. Its 24-scene outline and persistent private saves are separate from the expanded illustrated encounter mechanics. Verify actual tools before changing capability descriptions.
