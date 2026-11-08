// Shrinks a camera-roll photo on the phone before upload, so it's fast on bus data.
const MAX_SIDE = 720
const TARGET_BYTES = 220 * 1024

export async function compressImage(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(async () => {
    // Older Safari: fall back to an <img> element.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  })
  const sw = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
  const sh = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h)
  for (const q of [0.82, 0.7, 0.58, 0.45]) {
    let blob = await toBlob(canvas, 'image/webp', q)
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q) // Safari without WebP encode
    if (blob && blob.size <= TARGET_BYTES) return { blob, w, h }
  }
  const last = await toBlob(canvas, 'image/jpeg', 0.35)
  if (!last) throw new Error('Could not process image')
  return { blob: last, w, h }
}

function toBlob(c: HTMLCanvasElement, type: string, q: number) {
  return new Promise<Blob | null>(res => c.toBlob(res, type, q))
}
