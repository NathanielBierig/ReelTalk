import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import Home from './screens/Home'
import Room from './screens/Room'
import Solo from './screens/Solo'

export function navigate(path: string) {
  history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const on = () => setPath(location.pathname)
    window.addEventListener('popstate', on)
    return () => window.removeEventListener('popstate', on)
  }, [])
  const m = path.match(/^\/r\/([A-Za-z]{4})\/?$/)
  return (
    <>
      {m ? <Room code={m[1].toUpperCase()} /> : /^\/solo\/?$/.test(path) ? <Solo /> : <Home />}
      <Toaster />
    </>
  )
}
