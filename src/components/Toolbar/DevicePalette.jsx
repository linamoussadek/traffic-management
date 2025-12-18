import { useAppStore } from '../../store/appStore'
import { ONTARIO_SIGNS } from '../../utils/ontarioSigns'

// Common Ontario signs for quick manual placement
const COMMON_SIGNS = [
  'TC-51B', // Traffic Cones
  'TC-53A', // Barricades
  'TC-1',   // Construction Ahead
  'TC-2B',  // Road Work
  'TC-7tA', // Road Closed
  'TC-7tB', // Local Traffic Only
  'Rb-92',  // Road Closed (Regulatory)
  'TC-4R',  // Lane Closure Arrow Right
  'TC-12',  // Flashing Arrow Boards
]

const getSignIcon = (code) => {
  const signInfo = ONTARIO_SIGNS[code]
  if (!signInfo) return { emoji: '📍', color: '#7f8c8d' }
  
  if (signInfo.type === 'barrier') return { emoji: '🚧', color: '#f39c12' }
  if (signInfo.type === 'channelization') return { emoji: '🔺', color: '#e67e22' }
  if (signInfo.type === 'advance_warning') return { emoji: '⚠️', color: '#f39c12' }
  if (signInfo.type === 'lane_control') return { emoji: '⬅️', color: '#3498db' }
  if (signInfo.type === 'regulatory') return { emoji: '🛑', color: '#e74c3c' }
  if (signInfo.type === 'closure') return { emoji: '🚫', color: '#e74c3c' }
  if (signInfo.type === 'information') return { emoji: '📢', color: '#3498db' }
  return { emoji: '📍', color: '#7f8c8d' }
}

const DEVICE_TYPES = COMMON_SIGNS.map(code => {
  const signInfo = ONTARIO_SIGNS[code]
  const icon = getSignIcon(code)
  return {
    type: code,
    code: code,
    icon: icon.emoji,
    color: icon.color,
    label: signInfo ? `${code}: ${signInfo.name}` : code
  }
})

export default function DevicePalette() {
  const { activeTool, setActiveTool, selectedPhase, mapCenter, addDevice } = useAppStore()
  
  const handleDeviceClick = (deviceType) => {
    if (activeTool === deviceType) {
      setActiveTool(null)
    } else {
      setActiveTool(deviceType)
    }
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      padding: '12px', 
      background: '#fff', 
      borderBottom: '1px solid #ddd',
      flexWrap: 'wrap'
    }}>
      {DEVICE_TYPES.map(device => (
        <button
          key={device.type}
          onClick={() => handleDeviceClick(device.type)}
          style={{
            padding: '12px',
            background: activeTool === device.type ? device.color : '#f8f9fa',
            color: activeTool === device.type ? '#fff' : '#333',
            border: `2px solid ${activeTool === device.type ? device.color : '#ddd'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '24px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          title={device.label}
        >
          <span>{device.icon}</span>
          <span style={{ fontSize: '12px' }}>{device.label}</span>
        </button>
      ))}
    </div>
  )
}
