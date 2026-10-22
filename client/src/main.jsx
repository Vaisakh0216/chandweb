import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '10px' },
          success: { style: { background: '#f0f7f4', border: '1px solid #2e7d5e', color: '#1e5039' } },
          error: { style: { background: '#fef2f2', border: '1px solid #f87171', color: '#dc2626' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
