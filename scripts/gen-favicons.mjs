import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Read base64 from logo.ts
const logoTs = readFileSync(join(root, 'src/lib/logo.ts'), 'utf8')
const match = logoTs.match(/data:image\/jpeg;base64,([^"]+)"/)
if (!match) throw new Error('Could not extract base64 from logo.ts')
const buf = Buffer.from(match[1], 'base64')

// Circular mask SVG
const circleMask = (size) => Buffer.from(
  `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
)

// apple-touch-icon.png — 180x180 circular
const ati = await sharp(buf)
  .resize(180, 180, { fit: 'cover', position: 'centre' })
  .composite([{ input: circleMask(180), blend: 'dest-in' }])
  .png()
  .toBuffer()
writeFileSync(join(root, 'public/apple-touch-icon.png'), ati)
console.log('✓ apple-touch-icon.png')

// favicon-32x32.png — 32x32 circular
const f32 = await sharp(buf)
  .resize(32, 32, { fit: 'cover', position: 'centre' })
  .composite([{ input: circleMask(32), blend: 'dest-in' }])
  .png()
  .toBuffer()
writeFileSync(join(root, 'public/favicon-32x32.png'), f32)
console.log('✓ favicon-32x32.png')

// favicon.ico — 32x32 (browsers accept PNG bytes with .ico extension for modern use)
writeFileSync(join(root, 'public/favicon.ico'), f32)
console.log('✓ favicon.ico')
