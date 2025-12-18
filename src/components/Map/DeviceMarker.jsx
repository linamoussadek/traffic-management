import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useAppStore } from '../../store/appStore'
import { calculateDeviceCost } from '../../utils/ontarioRecommendationEngine'
import { ONTARIO_SIGNS } from '../../utils/ontarioSigns'

// Get icon for device - supports both old types and Ontario codes
const getDeviceIcon = (device) => {
  const code = device.code || device.type
  const signInfo = ONTARIO_SIGNS[code]
  
  if (signInfo) {
    // Map sign types to icons
    if (signInfo.type === 'barrier') return { emoji: '🚧', color: '#f39c12' }
    if (signInfo.type === 'channelization') return { emoji: '🔺', color: '#e67e22' }
    if (signInfo.type === 'advance_warning') return { emoji: '⚠️', color: '#f39c12' }
    if (signInfo.type === 'lane_control') return { emoji: '⬅️', color: '#3498db' }
    if (signInfo.type === 'regulatory') return { emoji: '🛑', color: '#e74c3c' }
    if (signInfo.type === 'lane_designation') return { emoji: '↗️', color: '#3498db' }
    if (signInfo.type === 'closure') return { emoji: '🚫', color: '#e74c3c' }
    if (signInfo.type === 'information') return { emoji: '📢', color: '#3498db' }
  }
  
  // Fallback for old device types
  const oldIcons = {
    type_ii_barricade: { emoji: '🚧', color: '#f39c12' },
    traffic_cone: { emoji: '🔺', color: '#e67e22' },
    road_closed_ahead_sign: { emoji: '🚫', color: '#3498db' },
    detour_sign: { emoji: '➡️', color: '#3498db' },
    arrow_board: { emoji: '⬅️', color: '#f39c12' },
    pedestrian_barricade: { emoji: '🚷', color: '#95a5a6' }
  }
  
  return oldIcons[code] || { emoji: '📍', color: '#7f8c8d' }
}

export default function DeviceMarker({ device }) {
  const { setSelectedDevice, updateDevice, deleteDevice } = useAppStore()
  const map = useMap()
  
  if (!device.lat || !device.lng) return null
  
  const iconConfig = getDeviceIcon(device)
  const deviceCode = device.code || device.type
  const signInfo = ONTARIO_SIGNS[deviceCode]
  const displayName = signInfo ? `${deviceCode}: ${signInfo.name}` : deviceCode.replace(/_/g, ' ').toUpperCase()
  
  const icon = L.divIcon({
    className: 'device-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${iconConfig.color};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${iconConfig.emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
  
  const handleDragEnd = (e) => {
    const newPosition = e.target.getLatLng()
    updateDevice(device.id, {
      lat: newPosition.lat,
      lng: newPosition.lng
    })
  }
  
  const cost = calculateDeviceCost(device)
  
  return (
    <Marker
      position={[device.lat, device.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
        click: () => setSelectedDevice(device)
      }}
    >
      <Popup>
        <div style={{ minWidth: '200px' }}>
          <strong>{displayName}</strong>
          {signInfo && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
              {signInfo.description}
            </div>
          )}
          <br />
          <div style={{ marginTop: '8px' }}>
            <div><strong>Quantity:</strong> {device.quantity || 1}</div>
            <div><strong>Phase:</strong> {device.phase || 'all'}</div>
            <div><strong>Cost:</strong> ${cost.toFixed(2)}</div>
            {device.reason && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                <strong>Reason:</strong> {device.reason}
              </div>
            )}
            {device.notes && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                <strong>Notes:</strong> {device.notes}
              </div>
            )}
          </div>
          <div style={{ marginTop: '12px' }}>
            <button
              onClick={() => {
                setSelectedDevice(device)
                map.closePopup()
              }}
              style={{
                padding: '4px 8px',
                marginRight: '4px',
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this device?')) {
                  deleteDevice(device.id)
                  map.closePopup()
                }
              }}
              style={{
                padding: '4px 8px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
