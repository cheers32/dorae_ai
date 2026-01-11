import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/')
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        const result = await response.text()
        setData(result)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="container">
      <div className="glass-card">
        <h1>Flask + React</h1>
        <div className="content">
          {loading && <p className="status loading">Loading...</p>}
          {error && <p className="status error">Error: {error}</p>}
          {data && (
            <div className="success">
              <p className="label">Server Response:</p>
              <p className="data">{data}</p>
            </div>
          )}
        </div>
        <button className="refresh-btn" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export default App
