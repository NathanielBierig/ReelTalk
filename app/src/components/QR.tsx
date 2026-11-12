import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function joinUrl(code: string) {
  return `${location.origin}/r/${code}`
}

export function QR({ code, size = 320 }: { code: string; size?: number }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(joinUrl(code), { margin: 1, width: size * 2, color: { dark: '#170C19', light: '#F7EAF0' } })
      .then(setSrc)
      .catch(() => setSrc(''))
  }, [code, size])
  return (
    <div className="rounded-3xl bg-ink p-3" style={{ width: size + 24 }}>
      {src ? <img src={src} width={size} height={size} alt={`QR code to join room ${code}`} className="rounded-xl" /> : <div style={{ width: size, height: size }} />}
    </div>
  )
}
