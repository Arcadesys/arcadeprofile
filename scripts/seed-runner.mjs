// Patch @next/env to have a default export before Payload loads
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

// Load .env.local manually first
import { config } from 'dotenv'
config({ path: '.env.local' })

// Now dynamically import the seed script
const { default: payloadConfig } = await import('../payload.config.ts')
import { getPayload } from 'payload'

async function seed() {
  console.log('Initializing Payload...')
  const payload = await getPayload({ config: payloadConfig })

  // 1. Seed books
  console.log('\n--- Seeding Books ---')
  const { books } = await import('../data/books.ts')
  for (const [key, book] of Object.entries(books)) {
    const existing = await payload.find({ collection: 'books', where: { key: { equals: key } } })
    if (existing.docs.length > 0) { console.log(`  [skip] ${key} (already exists)`); continue }
    await payload.create({
      collection: 'books',
      data: {
        key, title: book.title, description: book.description,
        coverImage: book.coverImage || null, buyLink: book.buyLink || null,
        hasBuyButton: book.hasBuyButton ?? false, hasPreview: book.hasPreview ?? false,
      },
    })
    console.log(`  [created] ${key}`)
  }

  // 2. Seed projects
  console.log('\n--- Seeding Projects ---')
  const { projects } = await import('../data/projects.ts')
  for (const project of projects) {
    const existing = await payload.find({ collection: 'projects', where: { title: { equals: project.title } } })
    if (existing.docs.length > 0) { console.log(`  [skip] ${project.title} (already exists)`); continue }
    await payload.create({
      collection: 'projects',
      data: {
        title: project.title, description: project.description,
        image: project.image || null, href: project.href,
        external: project.external ?? false, tags: project.tags || [],
      },
    })
    console.log(`  [created] ${project.title}`)
  }

  // 3. Seed demos
  console.log('\n--- Seeding Demos ---')
  const { demos } = await import('../data/demos.ts')
  for (const demo of demos) {
    const existing = await payload.find({ collection: 'demos', where: { slug: { equals: demo.slug } } })
    if (existing.docs.length > 0) { console.log(`  [skip] ${demo.slug} (already exists)`); continue }
    await payload.create({
      collection: 'demos',
      data: {
        slug: demo.slug, title: demo.title, description: demo.description,
        image: demo.image || null, embedUrl: demo.embedUrl, tags: demo.tags || [],
      },
    })
    console.log(`  [created] ${demo.slug}`)
  }

  console.log('\n--- Seeding complete! ---')
  process.exit(0)
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
