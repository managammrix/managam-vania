// Keepsake exports for the wedding ucapan/wishes.
//
// Three formats share one content structure: a cover, a grid of all guest
// names, then one slide/page per ucapan. Heavy libs are loaded only when an
// admin actually clicks an export button. jsPDF is dynamically imported, but
// pptxgenjs imports Node built-ins (node:fs, node:https) that webpack cannot
// bundle for a static/browser build, so we load its prebuilt browser bundle
// from a CDN at runtime instead (exposes window.PptxGenJS).
import type { WishRow } from './supabase'

const PPTXGENJS_CDN =
  'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'

// Load a classic <script> once, resolving when it's ready. Re-uses an existing
// tag (and its in-flight load) so repeated exports don't refetch.
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-src="${src}"]`,
    )
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error(`Failed to load ${src}`)))
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.dataset.src = src
    el.addEventListener('load', () => {
      el.dataset.loaded = 'true'
      resolve()
    })
    el.addEventListener('error', () =>
      reject(new Error(`Failed to load ${src}`)))
    document.head.appendChild(el)
  })
}

// Wedding palette (hex without '#', the form pptxgenjs wants; jsPDF gets RGB).
const FOREST = '1E3D2A'
const GOLD = 'C9A84C'
const CREAM = 'F5F0E8'
const WHITE = 'FFFFFF'

const COUPLE = 'Managam & Vania'
const DATE = '20 Juni 2026'

const hexToRgb = (h: string): [number, number, number] => [
  parseInt(h.slice(0, 2), 16),
  parseInt(h.slice(2, 4), 16),
  parseInt(h.slice(4, 6), 16),
]

const fileName = (ext: string) =>
  `ucapan-managam-vania-${new Date().toISOString().slice(0, 10)}.${ext}`

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('id', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : ''

// ───────────────────────── PPTX ─────────────────────────

export async function exportWishesPptx(wishes: WishRow[]) {
  await loadScript(PPTXGENJS_CDN)
  const PptxGenJS = (window as unknown as { PptxGenJS?: any }).PptxGenJS
  if (!PptxGenJS) throw new Error('PptxGenJS failed to load')
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 })
  pptx.layout = 'WIDE'
  const W = 13.333, H = 7.5

  // 1. Cover
  const cover = pptx.addSlide()
  cover.background = { color: CREAM }
  // gold frame
  cover.addShape('rect', {
    x: 0.4, y: 0.4, w: W - 0.8, h: H - 0.8,
    line: { color: GOLD, width: 1.5 }, fill: { type: 'none' },
  })
  cover.addText('Ucapan & Doa', {
    x: 0, y: 2.4, w: W, h: 1.4, align: 'center',
    fontFace: 'Cormorant Garamond', fontSize: 60, italic: true, color: FOREST,
  })
  cover.addShape('line', {
    x: W / 2 - 1, y: 4.0, w: 2, h: 0, line: { color: GOLD, width: 1.5 },
  })
  cover.addText(`${COUPLE}  ·  ${DATE}`, {
    x: 0, y: 4.2, w: W, h: 0.7, align: 'center',
    fontFace: 'Cinzel', fontSize: 20, color: GOLD, charSpacing: 3,
  })

  // 2. Grid of all guest names
  const grid = pptx.addSlide()
  grid.background = { color: WHITE }
  grid.addText('Daftar Tamu yang Memberikan Ucapan', {
    x: 0.5, y: 0.5, w: W - 1, h: 0.8, align: 'center',
    fontFace: 'Cormorant Garamond', fontSize: 30, italic: true, color: FOREST,
  })
  grid.addText(`Total ${wishes.length} ucapan`, {
    x: 0.5, y: 1.25, w: W - 1, h: 0.4, align: 'center',
    fontFace: 'Cinzel', fontSize: 12, color: GOLD, charSpacing: 2,
  })
  const COLS = 3
  const colW = (W - 1.6) / COLS
  const perCol = Math.ceil(wishes.length / COLS)
  for (let c = 0; c < COLS; c++) {
    const names = wishes.slice(c * perCol, (c + 1) * perCol)
      .map(w => w.author).join('\n')
    if (!names) continue
    grid.addText(names, {
      x: 0.8 + c * colW, y: 1.9, w: colW, h: H - 2.4,
      align: 'left', valign: 'top',
      fontFace: 'Cormorant Garamond', fontSize: 16, color: FOREST,
      lineSpacingMultiple: 1.3,
    })
  }

  // 3. One slide per ucapan
  for (const w of wishes) {
    const s = pptx.addSlide()
    s.background = { color: CREAM }
    s.addShape('rect', {
      x: 0.4, y: 0.4, w: W - 0.8, h: H - 0.8,
      line: { color: GOLD, width: 1 }, fill: { type: 'none' },
    })
    s.addText(w.author, {
      x: 0.8, y: 0.9, w: W - 1.6, h: 1, align: 'center',
      fontFace: 'Cormorant Garamond', fontSize: 40, italic: true, color: GOLD,
    })
    s.addShape('line', {
      x: W / 2 - 0.8, y: 2.0, w: 1.6, h: 0, line: { color: FOREST, width: 1 },
    })
    s.addText(`“${w.message}”`, {
      x: 1.2, y: 2.3, w: W - 2.4, h: 3.8, align: 'center', valign: 'middle',
      fontFace: 'Cormorant Garamond', fontSize: 26, italic: true,
      color: FOREST, fit: 'shrink', lineSpacingMultiple: 1.25,
    })
    if (w.created_at) {
      s.addText(fmtDate(w.created_at), {
        x: 0.8, y: H - 1.2, w: W - 1.6, h: 0.5, align: 'center',
        fontFace: 'Cinzel', fontSize: 11, color: GOLD, charSpacing: 1,
      })
    }
  }

  await pptx.writeFile({ fileName: fileName('pptx') })
}

// ───────────────────────── PDF (jsPDF) ─────────────────────────

export async function exportWishesPdf(wishes: WishRow[]) {
  const { jsPDF } = await import('jspdf')
  // Landscape A4 in points to mirror the slide aspect.
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 36 // margin

  const fill = (hex: string) => {
    const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b)
  }
  const stroke = (hex: string) => {
    const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b)
  }
  const text = (hex: string) => {
    const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b)
  }

  // 1. Cover
  fill(CREAM); doc.rect(0, 0, W, H, 'F')
  stroke(GOLD); doc.setLineWidth(1.5); doc.rect(M, M, W - 2 * M, H - 2 * M)
  text(FOREST); doc.setFont('times', 'italic'); doc.setFontSize(52)
  doc.text('Ucapan & Doa', W / 2, H / 2 - 20, { align: 'center' })
  stroke(GOLD); doc.setLineWidth(1.2)
  doc.line(W / 2 - 50, H / 2 + 6, W / 2 + 50, H / 2 + 6)
  text(GOLD); doc.setFont('helvetica', 'normal'); doc.setFontSize(15)
  doc.text(`${COUPLE}  ·  ${DATE}`, W / 2, H / 2 + 40, { align: 'center' })

  // 2. Grid of all guest names
  doc.addPage()
  fill(WHITE); doc.rect(0, 0, W, H, 'F')
  text(FOREST); doc.setFont('times', 'italic'); doc.setFontSize(26)
  doc.text('Daftar Tamu yang Memberikan Ucapan', W / 2, M + 24, { align: 'center' })
  text(GOLD); doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
  doc.text(`Total ${wishes.length} ucapan`, W / 2, M + 46, { align: 'center' })
  const COLS = 3
  const colW = (W - 2 * M) / COLS
  const perCol = Math.ceil(wishes.length / COLS)
  text(FOREST); doc.setFont('times', 'normal'); doc.setFontSize(13)
  const lineH = 22
  for (let c = 0; c < COLS; c++) {
    const names = wishes.slice(c * perCol, (c + 1) * perCol)
    names.forEach((w, i) => {
      doc.text(w.author, M + c * colW + 8, M + 86 + i * lineH, {
        maxWidth: colW - 16,
      })
    })
  }

  // 3. One page per ucapan, with auto-shrink + overflow to a 2nd page.
  for (const w of wishes) {
    doc.addPage()
    fill(CREAM); doc.rect(0, 0, W, H, 'F')
    stroke(GOLD); doc.setLineWidth(1); doc.rect(M, M, W - 2 * M, H - 2 * M)

    text(GOLD); doc.setFont('times', 'italic'); doc.setFontSize(34)
    doc.text(w.author, W / 2, M + 56, { align: 'center', maxWidth: W - 2 * M - 40 })
    stroke(FOREST); doc.setLineWidth(1)
    doc.line(W / 2 - 40, M + 78, W / 2 + 40, M + 78)

    // Fit the message: shrink the font until the wrapped block fits the body
    // area; if even the smallest size overflows, spill onto extra pages.
    text(FOREST); doc.setFont('times', 'italic')
    const bodyTop = M + 110
    const bodyBottom = H - M - 50
    const bodyH = bodyBottom - bodyTop
    const maxW = W - 2 * M - 80
    const msg = `“${w.message}”`
    let size = 24
    let lines: string[] = []
    let lh = 0
    while (size >= 12) {
      doc.setFontSize(size)
      lines = doc.splitTextToSize(msg, maxW)
      lh = size * 1.3
      if (lines.length * lh <= bodyH) break
      size -= 2
    }

    const linesPerPage = Math.max(1, Math.floor(bodyH / lh))
    if (lines.length <= linesPerPage) {
      // vertically centre the block
      const blockH = lines.length * lh
      const startY = bodyTop + (bodyH - blockH) / 2 + lh * 0.75
      doc.text(lines, W / 2, startY, { align: 'center' })
    } else {
      // overflow: paginate the wrapped lines
      for (let i = 0; i < lines.length; i += linesPerPage) {
        if (i > 0) {
          doc.addPage()
          fill(CREAM); doc.rect(0, 0, W, H, 'F')
          stroke(GOLD); doc.setLineWidth(1); doc.rect(M, M, W - 2 * M, H - 2 * M)
          text(GOLD); doc.setFont('times', 'italic'); doc.setFontSize(20)
          doc.text(`${w.author} (lanjutan)`, W / 2, M + 40, { align: 'center' })
          text(FOREST); doc.setFont('times', 'italic'); doc.setFontSize(size)
        }
        const chunk = lines.slice(i, i + linesPerPage)
        doc.text(chunk, W / 2, bodyTop + lh * 0.75, { align: 'center' })
      }
    }

    if (w.created_at) {
      text(GOLD); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(fmtDate(w.created_at), W / 2, H - M - 24, { align: 'center' })
    }
  }

  doc.save(fileName('pdf'))
}

// ───────────────────────── Print (print-CSS keepsake) ─────────────────────────

// Builds a self-contained HTML keepsake and opens it in a hidden iframe, then
// triggers the browser's print dialog (→ "Save as PDF" for richest typography).
export function printWishes(wishes: WishRow[]) {
  const esc = (s: string) => (s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

  const names = wishes.map(w =>
    `<li>${esc(w.author)}</li>`).join('')

  const pages = wishes.map(w => `
    <section class="wish">
      <div class="frame">
        <h2 class="author">${esc(w.author)}</h2>
        <div class="rule"></div>
        <p class="msg">&ldquo;${esc(w.message)}&rdquo;</p>
        ${w.created_at ? `<div class="ts">${esc(fmtDate(w.created_at))}</div>` : ''}
      </div>
    </section>`).join('')

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Ucapan — ${COUPLE}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cormorant Garamond', Georgia, serif; color: #1E3D2A; }
    section { width: 297mm; height: 210mm; page-break-after: always;
      display: flex; align-items: center; justify-content: center;
      padding: 12mm; }
    .cover { background: #F5F0E8; flex-direction: column; }
    .cover .border { border: 1.5pt solid #C9A84C; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8mm; }
    .cover h1 { font-style: italic; font-size: 64pt; color: #1E3D2A; }
    .cover .sub { font-family: 'Cinzel', serif; font-size: 18pt; color: #C9A84C;
      letter-spacing: 3px; }
    .cover .line { width: 60mm; height: 1.5pt; background: #C9A84C; }
    .grid { background: #fff; flex-direction: column; }
    .grid h2 { font-style: italic; font-size: 30pt; margin-bottom: 4mm; }
    .grid .count { font-family: 'Cinzel', serif; font-size: 12pt; color: #C9A84C;
      letter-spacing: 2px; margin-bottom: 8mm; }
    .grid ul { columns: 3; column-gap: 12mm; list-style: none;
      font-size: 16pt; line-height: 1.5; width: 100%; padding: 0 8mm; }
    .wish { background: #F5F0E8; }
    .wish .frame { border: 1pt solid #C9A84C; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 16mm; position: relative; }
    .wish .author { font-style: italic; font-size: 40pt; color: #C9A84C; }
    .wish .rule { width: 30mm; height: 1pt; background: #1E3D2A; margin: 6mm 0; }
    .wish .msg { font-style: italic; font-size: 24pt; line-height: 1.4;
      text-align: center; max-width: 80%; color: #1E3D2A; }
    .wish .ts { position: absolute; bottom: 12mm; font-family: 'Cinzel', serif;
      font-size: 10pt; color: #C9A84C; letter-spacing: 1px; }
  </style></head><body>
    <section class="cover"><div class="border">
      <h1>Ucapan &amp; Doa</h1>
      <div class="line"></div>
      <div class="sub">${COUPLE} &middot; ${DATE}</div>
    </div></section>
    <section class="grid">
      <h2>Daftar Tamu yang Memberikan Ucapan</h2>
      <div class="count">Total ${wishes.length} ucapan</div>
      <ul>${names}</ul>
    </section>
    ${pages}
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const idoc = iframe.contentWindow!.document
  idoc.open(); idoc.write(html); idoc.close()
  iframe.onload = () => {
    iframe.contentWindow!.focus()
    iframe.contentWindow!.print()
    // Give the print dialog time to read the document before teardown.
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }
}
