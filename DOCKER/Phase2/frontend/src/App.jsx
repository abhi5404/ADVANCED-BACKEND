import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('API unavailable')
      setHealth(await response.json())
    } catch {
      setHealth({ status: 'offline', redis: 'unavailable' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <main className="shell">
      <nav className="topbar">
        <span className="brand-mark">02</span>
        <span className="brand">Docker workspace</span>
        <span className="environment">PHASE 2 / LOCAL</span>
      </nav>
      <section className="intro">
        <p className="eyebrow">Containerized full-stack starter</p>
        <h1>Build, ship, <em>connect.</em></h1>
        <p className="lede">A React client, Express API, and Redis service running together through Docker Compose.</p>
      </section>
      <section className="status-panel">
        <div>
          <p className="eyebrow">System status</p>
          <h2>{loading ? 'Checking services...' : health?.status === 'ok' ? 'Everything is online.' : 'API needs attention.'}</h2>
        </div>
        <button type="button" onClick={checkHealth} disabled={loading}>{loading ? 'Checking' : 'Refresh status'}</button>
      </section>
      <section className="service-grid">
        <article className="service-card"><span className="service-icon">UI</span><div><h3>Frontend</h3><p>React + Vite</p></div><span className="pill live">Running</span></article>
        <article className="service-card"><span className="service-icon api">API</span><div><h3>Backend</h3><p>Express API · :5000</p></div><span className={`pill ${health?.status === 'ok' ? 'live' : 'down'}`}>{health?.status === 'ok' ? 'Running' : 'Offline'}</span></article>
        <article className="service-card"><span className="service-icon data">DB</span><div><h3>Redis</h3><p>Cache service · :6379</p></div><span className={`pill ${health?.redis === 'connected' ? 'live' : 'down'}`}>{health?.redis === 'connected' ? 'Connected' : 'Waiting'}</span></article>
      </section>
      <footer><span>React / JavaScript</span><span>Docker Compose ready</span></footer>
    </main>
  )
}

export default App
