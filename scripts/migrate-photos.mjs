// One-time migration: pull prewedding photos out of Supabase Storage,
// compress them with sharp, and drop them into public/prewedding so they
// ship with the static site on the Cloudflare Pages CDN ($0 egress).
//
// Run:  node scripts/migrate-photos.mjs
// Then commit public/prewedding/* and deploy.
//
// Idempotent: re-running overwrites the compressed files + manifest.

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const outDir = join(root, 'public', 'prewedding')

const SUPABASE_BASE =
  'https://bawnvpgjpueqdebjqcjp.supabase.co/storage/v1/object/public/prewedding'

const MAX_DIM = 1800          // longest edge, px
const TARGET_BYTES = 320 * 1024  // ~300KB ceiling
const MIN_QUALITY = 58

fs.mkdirSync(outDir, { recursive: true })

// Compress one buffer to JPEG under the size target by stepping quality down.
async function compress(input) {
  let quality = 82
  let out
  do {
    out = await sharp(input)
      .rotate() // honour EXIF orientation before stripping metadata
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
    if (out.length <= TARGET_BYTES || quality <= MIN_QUALITY) break
    quality -= 6
  } while (true)
  return { out, quality }
}

async function fetchOriginal(name) {
  const res = await fetch(`${SUPABASE_BASE}/${name}`)
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  return buf
}

const manifest = []
let totalBytes = 0

for (let n = 1; n <= 30; n++) {
  const name = String(n).padStart(2, '0') + '.jpg'
  let original
  try {
    original = await fetchOriginal(name)
  } catch (e) {
    console.error(`  ${name}: fetch failed — ${e.message}`)
    break
  }
  if (!original) {
    // First gap = end of the sequence.
    if (manifest.length > 0) break
    continue
  }

  const { out, quality } = await compress(original)
  fs.writeFileSync(join(outDir, name), out)
  manifest.push(name)
  totalBytes += out.length
  console.log(
    `  ${name}: ${Math.round(original.length / 1024)}KB → ` +
    `${Math.round(out.length / 1024)}KB (q${quality})`
  )
}

fs.writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
)

console.log(
  `\nDone: ${manifest.length} photos, ` +
  `${Math.round(totalBytes / 1024)}KB total → ${outDir}`
)
console.log('Manifest:', join(outDir, 'manifest.json'))
