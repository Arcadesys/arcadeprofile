// Preload: patch @next/env to add .default for Payload CJS/ESM interop
// Load env vars first
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') })

// Force-load @next/env and add default export
const nextEnv = require('@next/env')
nextEnv.default = nextEnv
