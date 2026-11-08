import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupMobileApi } from './services/mobileApiHandler'

// Initialize mobile API interceptor (enables full app functionality on Mobile Network)
setupMobileApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
