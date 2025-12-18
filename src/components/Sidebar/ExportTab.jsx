import { useAppStore } from '../../store/appStore'
import { FileDown, Download, Info } from 'lucide-react'
import { generateDetailedBOM, downloadBOM } from '../../utils/exporters'
import { calculateDeviceCost } from '../../utils/ontarioRecommendationEngine'
import { ONTARIO_SIGNS } from '../../utils/ontarioSigns'

export default function ExportTab() {
  const { devices, eventData, getPhases } = useAppStore()
  const phases = getPhases()
  
  const handleExportBOM = () => {
    if (devices.length === 0) {
      alert('No devices to export')
      return
    }
    
    const bom = generateDetailedBOM(devices, phases, eventData || {})
    const filename = `BOM-${eventData?.map_name || 'event'}-${new Date().toISOString().split('T')[0]}.csv`
    downloadBOM(bom, filename)
  }
  
  const { selectedPhase, getDevicesByPhase } = useAppStore()
  const visibleDevices = getDevicesByPhase(selectedPhase)
  
  const summary = {}
  visibleDevices.forEach(device => {
    if (!summary[device.type]) {
      summary[device.type] = { quantity: 0, cost: 0 }
    }
    summary[device.type].quantity += device.quantity || 1
    summary[device.type].cost += calculateDeviceCost(device)
  })
  
  const totalCost = visibleDevices.reduce((sum, d) => sum + calculateDeviceCost(d), 0)
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleExportBOM}
          disabled={devices.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            background: devices.length === 0 ? '#bdc3c7' : '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: devices.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: devices.length === 0 ? 'none' : '0 2px 4px rgba(39, 174, 96, 0.3)'
          }}
        >
          <FileDown size={16} />
          Export Bill of Materials
        </button>
        <div style={{ 
          marginTop: '6px', 
          fontSize: '11px', 
          color: '#7f8c8d',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Info size={12} />
          CSV format for spreadsheet import
        </div>
      </div>
      
      {/* BOM Summary */}
      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
          BOM Summary
        </h3>
        <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '16px' }}>
          Phase: {selectedPhase === 'all' ? 'All Phases' : selectedPhase}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(summary).map(([type, data]) => (
            <div key={type} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '8px', 
              background: '#fff', 
              borderRadius: '4px', 
              fontSize: '12px' 
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                  {(() => {
                    const signInfo = ONTARIO_SIGNS[type]
                    return signInfo ? `${type}: ${signInfo.name}` : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  })()}
                </div>
                <div style={{ color: '#7f8c8d', fontSize: '11px' }}>Qty: {data.quantity}</div>
              </div>
              <div style={{ fontWeight: '600', color: '#27ae60' }}>${data.cost.toFixed(2)}</div>
            </div>
          ))}
          {Object.keys(summary).length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d', fontSize: '12px' }}>
              No devices in this phase
            </div>
          )}
          {Object.keys(summary).length > 0 && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '12px', 
              borderTop: '2px solid #e0e0e0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '14px', 
              fontWeight: '700' 
            }}>
              <span style={{ color: '#2c3e50' }}>Total</span>
              <span style={{ color: '#27ae60' }}>${totalCost.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Export Info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        background: '#e8f5e9', 
        borderRadius: '8px', 
        border: '1px solid #4caf50' 
      }}>
        <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: '600', marginBottom: '8px' }}>
          Export Options
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', color: '#2e7d32', lineHeight: '1.6' }}>
          <li>CSV format for spreadsheet import</li>
          <li>Includes device types, quantities, and costs</li>
          <li>Can be imported into procurement systems</li>
        </ul>
      </div>
    </div>
  )
}
