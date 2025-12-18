import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { MapPin, AlertTriangle, FileDown, Settings } from 'lucide-react'
import OverviewTab from './OverviewTab'
import DevicesTab from './DevicesTab'
import ExportTab from './ExportTab'
import DevicePropertiesPanel from '../Panels/DevicePropertiesPanel'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'devices', label: 'Devices' },
  { id: 'export', label: 'Export' }
]

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('overview')
  const { selectedDevice, eventData } = useAppStore()
  
  return (
    <div style={{ 
      display: 'flex',
      height: '100%',
      width: '380px',
      background: '#fff',
      borderRight: '1px solid #e0e0e0',
      flexDirection: 'column',
      boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e0e0e0', 
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        color: '#fff'
      }}>
        <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: '600' }}>
          Traffic Control Planner
        </h2>
        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
          {eventData?.map_name || 'Ottawa Race Weekend 2025'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e0e0e0',
        background: '#fafafa'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#2c3e50' : '#7f8c8d',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3498db' : 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              textTransform: 'capitalize',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'devices' && <DevicesTab />}
        {activeTab === 'export' && <ExportTab />}
      </div>
      
      {/* Device Properties Panel */}
      {selectedDevice && (
        <DevicePropertiesPanel />
      )}
    </div>
  )
}
