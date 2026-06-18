import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { seedDemoData } from './utils/seedData'
import './index.css'

seedDemoData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
