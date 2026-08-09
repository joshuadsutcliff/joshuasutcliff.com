import { useEffect, useState, type FormEvent } from 'react'

type GateState = 'checking' | 'gate' | 'open' | 'unavailable'

export default function Baton() {
  const [state, setState] = useState<GateState>('checking')
  const [password, setPassword] = useState('')
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    document.title = 'Briefing'
    fetch('/api/baton/deck')
      .then((res) => setState(res.ok ? 'open' : 'gate'))
      .catch(() => setState('gate'))
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setInvalid(false)
    try {
      const res = await fetch('/api/baton/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 204) {
        setState('open')
        return
      }
      if (res.status === 500) {
        setState('unavailable')
        return
      }
      setInvalid(true)
    } catch {
      setInvalid(true)
    }
  }

  if (state === 'open') {
    return (
      <iframe
        src="/api/baton/deck"
        title="Briefing"
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 'none', background: '#0b0e14' }}
      />
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0e14',
      }}
    >
      {state === 'unavailable' ? (
        <p style={{ color: '#5c6470', fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>unavailable</p>
      ) : state === 'gate' ? (
        <form onSubmit={submit}>
          <input
            type="password"
            autoFocus
            aria-label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setInvalid(false)
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${invalid ? '#e5484d' : '#2a3140'}`,
              borderRadius: 8,
              color: '#e6e9ef',
              padding: '10px 14px',
              fontSize: 15,
              width: 220,
              outline: 'none',
              textAlign: 'center',
              fontFamily: 'ui-monospace, monospace',
            }}
          />
        </form>
      ) : null}
    </div>
  )
}
