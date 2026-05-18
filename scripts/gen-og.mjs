import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)
const sharp = require('sharp')

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

const W = 1200
const H = 630
const BG = '#1e3d2a'
const GOLD = '#b8965a'
const CREAM = '#f5f0e8'
const SAGE = '#9db89f'

// Read logo and convert to base64 for embedding
const logoPath = join(root, 'public', 'mv-logo.jpg')
const logoBase64 = fs.readFileSync(logoPath).toString('base64')

// Resize logo to 120x120 circle via sharp composite
const logoResized = await sharp(logoPath)
  .resize(120, 120)
  .toBuffer()

// Build SVG — all text rendered as SVG text (no font embedding needed)
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Subtle botanical ellipses -->
  <ellipse cx="120" cy="120" rx="160" ry="90" fill="none" stroke="#2d5a3d" stroke-width="0.8" opacity="0.4" transform="rotate(-30,120,120)"/>
  <ellipse cx="${W-120}" cy="${H-120}" rx="160" ry="90" fill="none" stroke="#2d5a3d" stroke-width="0.8" opacity="0.4" transform="rotate(150,${W-120},${H-120})"/>

  <!-- Gold thin rule top -->
  <line x1="80" y1="52" x2="${W-80}" y2="52" stroke="${GOLD}" stroke-width="0.5" opacity="0.6"/>

  <!-- Logo circle -->
  <clipPath id="logoClip">
    <circle cx="${W/2}" cy="148" r="56"/>
  </clipPath>
  <circle cx="${W/2}" cy="148" r="58" fill="none" stroke="${GOLD}" stroke-width="1"/>
  <image href="data:image/jpeg;base64,${logoBase64}" x="${W/2-56}" y="92" width="112" height="112" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>

  <!-- Names -->
  <text x="${W/2}" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-style="italic" font-weight="300" fill="${CREAM}" letter-spacing="2">Managam</text>
  <text x="${W/2}" y="318" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-style="italic" fill="${GOLD}" opacity="0.9">&amp;</text>
  <text x="${W/2}" y="370" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-style="italic" font-weight="300" fill="${CREAM}" letter-spacing="2">Vania</text>

  <!-- Divider -->
  <line x1="${W/2-60}" y1="400" x2="${W/2+60}" y2="400" stroke="${GOLD}" stroke-width="0.5" opacity="0.7"/>

  <!-- Date -->
  <text x="${W/2}" y="438" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="${SAGE}" letter-spacing="8">20 · 06 · 2026</text>

  <!-- Hashtag -->
  <text x="${W/2}" y="510" text-anchor="middle" font-family="Georgia, serif" font-size="18" font-style="italic" fill="${SAGE}" opacity="0.75" letter-spacing="1">#BuildingMANAGAMVANturesWithGod</text>

  <!-- Gold thin rule bottom -->
  <line x1="80" y1="${H-52}" x2="${W-80}" y2="${H-52}" stroke="${GOLD}" stroke-width="0.5" opacity="0.6"/>

  <!-- Sub label -->
  <text x="${W/2}" y="${H-28}" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="${SAGE}" opacity="0.5" letter-spacing="4">WEDDING INVITATION · JAKARTA</text>
</svg>`

const outPath = join(root, 'public', 'og.jpg')

await sharp(Buffer.from(svg))
  .jpeg({ quality: 92 })
  .toFile(outPath)

const stat = fs.statSync(outPath)
console.log(`og.jpg generated: ${Math.round(stat.size / 1024)}KB at ${outPath}`)
