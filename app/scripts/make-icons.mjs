// Regenerates every icon in app/public/ from the one logo mark below.
// Run: cd app && node scripts/make-icons.mjs   (uses the Playwright Chromium that is already installed)
// Why raster icons: browsers, iOS and Google only reliably pick up PNG/ICO at fixed sizes, not just an SVG.
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = new URL('../public/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const IG = ['#4F5BD5', '#962FBF', '#D62976', '#FA7E1E', '#FEDA75']
const gradDefs = (id) => `<defs>
<linearGradient id="${id}t" x1="1" y1="0" x2="0" y2="1">${IG.map((c, i) => `<stop offset="${[0, 0.28, 0.58, 0.84, 1][i]}" stop-color="${c}"/>`).join('')}</linearGradient>
<linearGradient id="${id}g" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4F5BD5"/><stop offset=".35" stop-color="#962FBF"/><stop offset=".7" stop-color="#D62976"/><stop offset="1" stop-color="#FA7E1E"/></linearGradient>
</defs>`

/**
 * The mark: hollow gradient reel (play + speech tail) behind a gold typing bubble.
 * mode "full": thin lines, play triangle, three dots. mode "bold": chunkier, for 16 to 48 px.
 * shape "tile": rounded tile with transparent corners. shape "bleed": fills the canvas (iOS rounds it itself).
 */
export function iconSvg({ size = 64, mode = 'full', shape = 'tile', id = 'i' } = {}) {
  const bold = mode === 'bold'
  const border = bold ? 5 : 3.5
  const rx = shape === 'bleed' ? 0 : 15
  const innerInset = shape === 'bleed' ? 9 : border
  const innerRx = shape === 'bleed' ? 14 : 15 - border + 2
  const sw = bold ? 3.1 : 1.9
  const s = shape === 'bleed' ? 2.0 : bold ? 2.0 : 2.3
  const tx = (64 - 24 * s) / 2 + 0.2
  const ty = (64 - 24 * s) / 2 + 0.1
  const bubble = 'M4 9h8.5a3 3 0 0 1 3 3v4.5a3 3 0 0 1-3 3H9L5 22.5v-3H4a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z'
  const reel = 'M11 1.5h8.5a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-.8v3.2L15.2 14H11a3 3 0 0 1-3-3V4.5a3 3 0 0 1 3-3z'
  const dots = bold
    ? '' // too small to read at 16 px: the gold bubble alone carries it
    : [5, 8.25, 11.5].map((cx, i) => `<circle cx="${cx}" cy="14.25" r="1.3" fill="#fff" opacity="${1 - i * 0.3}"/>`).join('')
  const boldDots = bold ? [5.2, 8.2, 11.2].map((cx) => `<circle cx="${cx}" cy="14.25" r="1.35" fill="#160A1C"/>`).join('') : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${gradDefs(id)}
<rect width="64" height="64" rx="${rx}" fill="url(#${id}t)"/>
<rect x="${innerInset}" y="${innerInset}" width="${64 - innerInset * 2}" height="${64 - innerInset * 2}" rx="${innerRx}" fill="#160A1C"/>
<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})">
<path d="${reel}" fill="none" stroke="url(#${id}g)" stroke-width="${sw}" stroke-linejoin="round"/>
${bold ? '' : `<path d="M14.6 4.2v4.6l3.9-2.3z" fill="none" stroke="url(#${id}g)" stroke-width="1.5" stroke-linejoin="round"/>`}
${bold ? `<path d="M14.4 4.3v4.4l3.8-2.2z" fill="url(#${id}g)" stroke="url(#${id}g)" stroke-width="1" stroke-linejoin="round"/>` : ''}
<path d="${bubble}" fill="#FEDA75" stroke="#160A1C" stroke-width="${bold ? 1.8 : 1.4}" stroke-linejoin="round"/>
${dots}${boldDots}
</g></svg>`
}

function ico(pngs) {
  // PNG-compressed ICO: 6-byte header, 16-byte directory entry per image, then the PNG blobs.
  const head = Buffer.alloc(6)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const dir = pngs.map(({ size, buf }) => {
    const e = Buffer.alloc(16)
    e[0] = size === 256 ? 0 : size
    e[1] = size === 256 ? 0 : size
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(buf.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += buf.length
    return e
  })
  return Buffer.concat([head, ...dir, ...pngs.map((p) => p.buf)])
}

const browser = await chromium.launch()
async function png(svg, size) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  return buf
}

writeFileSync(OUT + 'favicon.svg', iconSvg({ mode: 'full', id: 'fv' }))
const small = {}
for (const n of [16, 32, 48]) small[n] = await png(iconSvg({ mode: 'bold', id: 's' + n }), n)
writeFileSync(OUT + 'favicon.ico', ico([16, 32, 48].map((n) => ({ size: n, buf: small[n] }))))
writeFileSync(OUT + 'favicon-32.png', small[32])
writeFileSync(OUT + 'favicon-48.png', small[48]) // Google wants a multiple of 48 px
writeFileSync(OUT + 'apple-touch-icon.png', await png(iconSvg({ mode: 'full', shape: 'bleed', id: 'at' }), 180))
writeFileSync(OUT + 'icon-192.png', await png(iconSvg({ mode: 'full', id: 'a192' }), 192))
writeFileSync(OUT + 'icon-512.png', await png(iconSvg({ mode: 'full', id: 'a512' }), 512))
writeFileSync(OUT + 'manifest.webmanifest', JSON.stringify({
  name: 'Reel Talk', short_name: 'Reel Talk',
  description: "The party game where your friends' reels are the cards.",
  start_url: '/', display: 'standalone', background_color: '#0E0612', theme_color: '#0E0612',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
}, null, 2) + '\n')
await browser.close()
console.log('icons written to', OUT)
