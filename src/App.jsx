import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')

  return (
    <div className="min-h-screen bg-black">
      <AnimatePresence mode="wait">
        {currentPage === 'landing' ? (
          <LandingPage key="landing" onEnterDashboard={() => setCurrentPage('dashboard')} />
        ) : (
          <Dashboard key="dashboard" onBack={() => setCurrentPage('landing')} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
