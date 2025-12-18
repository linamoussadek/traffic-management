import React, { useEffect } from 'react'
import TrafficControlMap from './components/Map/TrafficControlMap'
import Sidebar from './components/Sidebar/Sidebar'
import Toolbar from './components/Toolbar/Toolbar'
import { useAppStore } from './store/appStore'

function App() {
  const { mapCenter, setMapCenter } = useAppStore()
  
  useEffect(() => {
    // Initialize map center if not set
    if (!mapCenter) {
      setMapCenter([45.41, -75.70]) // Default to Ottawa
    }
  }, [])
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <Toolbar />
      <div style={{ 
        display: 'flex', 
        flex: 1, 
        overflow: 'hidden'
      }}>
        <Sidebar />
        <div style={{ 
          flex: 1, 
          position: 'relative',
          background: '#f0f0f0'
        }}>
          <TrafficControlMap />
        </div>
      </div>
    </div>
  )
}

export default App
