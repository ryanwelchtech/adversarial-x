import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'

function App() {
  const [currentPage, setCurrentPage] = useState('landing')

  return (
    <div className="min-h-screen bg-black">
      {currentPage === 'landing' ? (
        <LandingPage onEnterDashboard={() => {
          console.log('Navigating to Dashboard...')
          setCurrentPage('dashboard')
        }} />
      ) : (
        <Dashboard onBack={() => {
          console.log('Navigating back to Landing...')
          setCurrentPage('landing')
        }} />
      )}
    </div>
  )
}

export default App
