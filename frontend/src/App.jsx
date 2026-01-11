import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inputText, setInputText] = useState('')
  const [saveStatus, setSaveStatus] = useState(null)

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

  const handleSave = async () => {
    if (!inputText.trim()) return

    setSaveStatus('Saving...')
    try {
      const response = await fetch('http://127.0.0.1:5000/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word: inputText }),
      })

      if (response.ok) {
        setSaveStatus('Saved successfully!')
        setInputText('')
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        const result = await response.json()
        setSaveStatus(`Error: ${result.error}`)
      }
    } catch (err) {
      setSaveStatus(`Error: ${err.message}`)
    }
  }

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

        <div className="input-section">
          <input
            type="text"
            className="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a word..."
          />
          <button className="save-btn" onClick={handleSave} disabled={!inputText.trim()}>
            Save to File
          </button>
          {saveStatus && <p className="save-status">{saveStatus}</p>}
        </div>

        <button className="refresh-btn" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
    </div>
  )
}

export default App
