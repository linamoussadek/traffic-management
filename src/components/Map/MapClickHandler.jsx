import { useMapEvents } from 'react-leaflet'
import { useAppStore } from '../../store/appStore'
import { ONTARIO_SIGNS, getSignCost } from '../../utils/ontarioSigns'

/**
 * Component to handle map clicks for device placement
 */
export default function MapClickHandler() {
  const { activeTool, setActiveTool, selectedPhase, addDevice } = useAppStore()
  
  useMapEvents({
    click: (e) => {
      if (activeTool) {
        const signInfo = ONTARIO_SIGNS[activeTool]
        addDevice({
          code: activeTool,
          type: activeTool,
          quantity: 1,
          phase: selectedPhase,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          reason: 'Manually placed',
          confidence: 1.0,
          cost: signInfo ? signInfo.cost : 15.00
        })
        setActiveTool(null)
      }
    }
  })
  
  return null
}
