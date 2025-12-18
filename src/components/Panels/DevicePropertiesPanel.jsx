import { useAppStore } from '../../store/appStore'
import { calculateDeviceCost } from '../../utils/ontarioRecommendationEngine'
import { ONTARIO_SIGNS } from '../../utils/ontarioSigns'

// Get all Ontario sign codes grouped by category
const getDeviceTypesByCategory = () => {
  const categories = {
    'Traffic Cones & Markers': [],
    'Advance Warning': [],
    'Lane Closure & Control': [],
    'Special Information': [],
    'Regulatory': [],
    'Turn Lane Designation': []
  }
  
  Object.entries(ONTARIO_SIGNS).forEach(([code, sign]) => {
    if (sign.type === 'channelization' || sign.type === 'barrier') {
      categories['Traffic Cones & Markers'].push({ code, ...sign })
    } else if (sign.type === 'advance_warning') {
      categories['Advance Warning'].push({ code, ...sign })
    } else if (sign.type === 'lane_control' || sign.type === 'closure') {
      categories['Lane Closure & Control'].push({ code, ...sign })
    } else if (sign.type === 'information') {
      categories['Special Information'].push({ code, ...sign })
    } else if (sign.type === 'regulatory') {
      categories['Regulatory'].push({ code, ...sign })
    } else if (sign.type === 'lane_designation') {
      categories['Turn Lane Designation'].push({ code, ...sign })
    }
  })
  
  return categories
}

export default function DevicePropertiesPanel() {
  const { selectedDevice, updateDevice, deleteDevice, setSelectedDevice, getPhases } = useAppStore()
  
  if (!selectedDevice) return null
  
  const phases = getPhases()
  const cost = calculateDeviceCost(selectedDevice)
  
  const handleUpdate = (updates) => {
    updateDevice(selectedDevice.id, updates)
  }
  
  const handleDelete = () => {
    if (window.confirm('Delete this device?')) {
      deleteDevice(selectedDevice.id)
      setSelectedDevice(null)
    }
  }
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#fff', 
      borderTop: '1px solid #ddd',
      maxHeight: '400px',
      overflow: 'auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Device Properties</h3>
        <button
          onClick={() => setSelectedDevice(null)}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#999'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '4px', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Device Type (Ontario Code)
          </label>
          <select
            value={selectedDevice.code || selectedDevice.type}
            onChange={(e) => handleUpdate({ code: e.target.value, type: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {Object.entries(getDeviceTypesByCategory()).map(([category, signs]) => (
              <optgroup key={category} label={category}>
                {signs.map(sign => (
                  <option key={sign.code} value={sign.code}>
                    {sign.code}: {sign.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {(() => {
            const code = selectedDevice.code || selectedDevice.type
            const signInfo = ONTARIO_SIGNS[code]
            return signInfo ? (
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {signInfo.description}
              </div>
            ) : null
          })()}
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '4px', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Quantity
          </label>
          <input
            type="number"
            value={selectedDevice.quantity || 1}
            onChange={(e) => handleUpdate({ quantity: parseInt(e.target.value) || 1 })}
            min="1"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '4px', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Phase
          </label>
          <select
            value={selectedDevice.phase || 'all'}
            onChange={(e) => handleUpdate({ phase: e.target.value })}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            <option value="all">All Phases</option>
            {phases.map(phase => (
              <option key={phase.id} value={phase.id}>
                {phase.time}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '4px', 
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Notes
          </label>
          <textarea
            value={selectedDevice.notes || ''}
            onChange={(e) => handleUpdate({ notes: e.target.value })}
            rows="3"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ 
          padding: '12px', 
          background: '#f8f9fa', 
          borderRadius: '4px'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Unit Cost: ${(() => {
              const code = selectedDevice.code || selectedDevice.type
              const signInfo = ONTARIO_SIGNS[code]
              return (signInfo?.cost || 15.00).toFixed(2)
            })()}
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#27ae60' }}>
            Total Cost: ${cost.toFixed(2)}
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          style={{
            width: '100%',
            padding: '10px',
            background: '#e74c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Delete Device
        </button>
      </div>
    </div>
  )
}
