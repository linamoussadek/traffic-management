import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Polygon, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useAppStore } from '../../store/appStore'
import DeviceMarker from './DeviceMarker'
import POILayer from './POILayer'
import MapClickHandler from './MapClickHandler'

// Fix for default marker icons in Leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

function MapController() {
  const map = useMap()
  const { mapCenter, mapZoom, setMapCenter, setMapZoom } = useAppStore()
  
  useEffect(() => {
    if (mapCenter && mapZoom) {
      map.setView(mapCenter, mapZoom)
    }
  }, [map, mapCenter, mapZoom])
  
  useMapEvents({
    moveend: () => {
      setMapCenter(map.getCenter())
      setMapZoom(map.getZoom())
    },
    zoomend: () => {
      setMapZoom(map.getZoom())
    }
  })
  
  return null
}

export default function TrafficControlMap() {
  const {
    routes,
    pois,
    devices,
    boundaryPoints,
    selectedPhase,
    roadNetwork,
    closurePolygon,
    affectedRoads,
    mapCenter,
    mapZoom
  } = useAppStore()
  
  // Convert routes to Leaflet format [lat, lng]
  const routePolylines = routes.map(route => ({
    coordinates: route.coordinates || route.geometry?.map(c => [c[1], c[0]]) || [],
    lineId: route.lineId
  }))
  
  // Filter devices by phase
  const visibleDevices = selectedPhase === 'all' 
    ? devices 
    : devices.filter(d => d.phase === selectedPhase)
  
  // Create closure polygon layer if available
  const closureLayer = closurePolygon ? (() => {
    const geometry = closurePolygon.geometry || closurePolygon
    if (geometry.type === 'Polygon' && geometry.coordinates) {
      // Polygon coordinates are nested: [[[lng, lat], ...]]
      const outerRing = geometry.coordinates[0] || []
      const positions = outerRing.map(c => [c[1], c[0]]) // Convert [lng, lat] to [lat, lng]
      return (
        <Polygon
          positions={positions}
          pathOptions={{
            color: 'red',
            weight: 3,
            opacity: 0.5,
            fillColor: 'red',
            fillOpacity: 0.2
          }}
        />
      )
    } else if (geometry.type === 'LineString' && geometry.coordinates) {
      return (
        <Polyline
          positions={geometry.coordinates.map(c => [c[1], c[0]])}
          color="red"
          weight={3}
          opacity={0.5}
        />
      )
    }
    return null
  })() : null
  
  return (
    <MapContainer
      center={mapCenter || [45.41, -75.70]}
      zoom={mapZoom || 13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapController />
      <MapClickHandler />
      
      {/* Route Polylines */}
      {routePolylines.map((route, index) => (
        <Polyline
          key={`route-${route.lineId || index}`}
          positions={route.coordinates}
          color="blue"
          weight={4}
          opacity={0.7}
        />
      ))}
      
      {/* Closure Polygon */}
      {closureLayer}
      
      {/* Affected Roads */}
      {affectedRoads && affectedRoads.map((road, index) => (
        <Polyline
          key={`road-${road.properties?.id || index}`}
          positions={road.geometry.coordinates.map(c => [c[1], c[0]])}
          color="orange"
          weight={2}
          opacity={0.4}
          dashArray="5, 5"
        />
      ))}
      
      {/* Boundary Points */}
      {boundaryPoints.map((point, index) => (
        <Marker
          key={`boundary-${point.id || index}`}
          position={[point.point[1], point.point[0]]}
          icon={L.divIcon({
            className: 'boundary-marker',
            html: '<div style="width: 12px; height: 12px; background: red; border: 2px solid white; border-radius: 50%;"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        >
          <Popup>
            <div>
              <strong>Boundary Point</strong><br />
              Road: {point.road_name}<br />
              Class: {point.road_class}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* POIs */}
      <POILayer pois={pois} />
      
      {/* Devices */}
      {visibleDevices.map(device => (
        <DeviceMarker key={device.id} device={device} />
      ))}
    </MapContainer>
  )
}
