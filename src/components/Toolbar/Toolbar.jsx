import { useState } from 'react'
import { Menu, X, MapPin } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import DevicePalette from './DevicePalette'
import PhaseSelector from './PhaseSelector'

export default function Toolbar() {
  const [showSidebar, setShowSidebar] = useState(true)
  const { setShowSidebar: setStoreSidebar } = useAppStore()
  
  // Note: This is a simple toggle. In a full implementation, you'd want to
  // manage sidebar visibility in the store and pass it to the App component
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{ 
        padding: '12px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ flex: 1 }} />
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '13px', 
          color: '#7f8c8d' 
        }}>
          <MapPin size={16} />
          <span>Click device palette, then click map to place | Drag to move</span>
        </div>
      </div>
      <PhaseSelector />
      <DevicePalette />
    </div>
  )
}
