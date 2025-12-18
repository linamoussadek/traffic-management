import { useAppStore } from '../../store/appStore'
import { Trash2, Edit3 } from 'lucide-react'
import { calculateDeviceCost } from '../../utils/ontarioRecommendationEngine'
import { ONTARIO_SIGNS } from '../../utils/ontarioSigns'

export default function DevicesTab() {
  const { devices, selectedPhase, setSelectedDevice, deleteDevice, getDevicesByPhase } = useAppStore()
  
  const visibleDevices = getDevicesByPhase(selectedPhase)
  
  const totalCost = visibleDevices.reduce((sum, device) => {
    return sum + calculateDeviceCost(device)
  }, 0)
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        padding: '16px', 
        background: 'linear-gradient(135deg, #d5f4e6 0%, #a8e6cf 100%)',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#27ae60' }}>
          ${totalCost.toFixed(2)}
        </div>
        <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
          Total Cost ({visibleDevices.length} devices)
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visibleDevices.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#999',
            fontSize: '14px'
          }}>
            No devices in this phase
          </div>
        ) : (
          visibleDevices.map(device => {
            const cost = calculateDeviceCost(device)
            return (
              <div
                key={device.id}
                style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3498db'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  e.currentTarget.style.background = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.background = '#f8f9fa'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#2c3e50', marginBottom: '4px' }}>
                      {(() => {
                        const code = device.code || device.type
                        const signInfo = ONTARIO_SIGNS[code]
                        return signInfo ? `${code}: ${signInfo.name}` : code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      })()}
                    </div>
                    {device.reason && (
                      <div style={{ fontSize: '11px', color: '#7f8c8d', marginBottom: '4px' }}>
                        {device.reason}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteDevice(device.id)
                    }}
                    style={{ 
                      padding: '4px', 
                      border: 'none', 
                      background: 'transparent', 
                      cursor: 'pointer', 
                      color: '#e74c3c',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={device.quantity || 1}
                    onChange={(e) => {
                      const { updateDevice } = useAppStore.getState()
                      updateDevice(device.id, { quantity: parseInt(e.target.value) || 1 })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      width: '60px', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd', 
                      fontSize: '12px' 
                    }}
                    min="1"
                  />
                  <span style={{ fontSize: '11px', color: '#7f8c8d' }}>units</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#27ae60', marginLeft: 'auto' }}>
                    ${cost.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedDevice(device)
                  }}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '6px',
                    background: '#3498db',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit3 size={12} />
                  Edit Details
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
