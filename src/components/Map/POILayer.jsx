import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const POI_ICONS = {
  raceinfo: { emoji: '🏁', color: '#e74c3c' },
  medical: { emoji: '🏥', color: '#e74c3c' },
  waterstation: { emoji: '💧', color: '#3498db' },
  default: { emoji: '📍', color: '#7f8c8d' }
}

export default function POILayer({ pois = [] }) {
  return (
    <>
      {pois.map(poi => {
        if (!poi.lat || !poi.lng) return null
        
        const iconConfig = POI_ICONS[poi.type] || POI_ICONS.default
        
        const icon = L.divIcon({
          className: 'poi-marker',
          html: `
            <div style="
              width: 28px;
              height: 28px;
              background: ${iconConfig.color};
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
              ${iconConfig.emoji}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
        
        return (
          <Marker
            key={poi.id}
            position={[poi.lat, poi.lng]}
            icon={icon}
          >
            <Popup>
              <div>
                <strong>{poi.type.toUpperCase()}</strong>
                <br />
                {poi.description && <div>{poi.description}</div>}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
