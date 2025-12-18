import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Upload, Map, Zap, AlertTriangle, Info } from 'lucide-react'
import { loadEventData, validateEventData, parseEventData, parsePOIs } from '../../utils/dataLoader'
import { fetchOSMRoads, calculateBBoxFromRoutes } from '../../utils/osmLoader'
import { findClosureBoundaries } from '../../utils/closureAnalysis'
import { buildScenariosForBoundaries } from '../../utils/scenarioBuilder'
import { OntarioTrafficControlRecommender, calculateDeviceCost } from '../../utils/ontarioRecommendationEngine'

// Fix for getPhases - it's a method on the store, not a standalone function
const getPhasesFromStore = () => useAppStore.getState().getPhases()

export default function OverviewTab() {
  const {
    eventData,
    setEventData,
    setRoutes,
    setPOIs,
    setRoadNetwork,
    setClosurePolygon,
    setAffectedRoads,
    setBoundaryPoints,
    addDevice,
    boundaryPoints,
    devices,
    selectedPhase,
    getDevicesByPhase
  } = useAppStore()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingOSM, setLoadingOSM] = useState(false)
  
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setLoading(true)
    setError(null)
    
    try {
      const jsonData = await loadEventData(file)
      const errors = validateEventData(jsonData)
      
      if (errors.length > 0) {
        throw new Error('Validation errors: ' + errors.join(', '))
      }
      
      // Parse data
      const routes = parseEventData(jsonData)
      const pois = parsePOIs(jsonData)
      
      // Update store
      setEventData(jsonData)
      setRoutes(routes)
      setPOIs(pois)
      
      // Calculate map center from routes or use default from data
      let mapCenter = null
      if (routes.length > 0 && routes[0].coordinates.length > 0) {
        const firstRoute = routes[0]
        const midPoint = firstRoute.coordinates[Math.floor(firstRoute.coordinates.length / 2)]
        mapCenter = [midPoint[0], midPoint[1]] // [lat, lng]
      } else {
        // Try to get from data
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData
        if (data.lat_start && data.lng_start) {
          mapCenter = [parseFloat(data.lat_start), parseFloat(data.lng_start)]
        }
      }
      
      if (mapCenter) {
        useAppStore.getState().setMapCenter(mapCenter)
        if (jsonData.map_zoom_start) {
          useAppStore.getState().setMapZoom(jsonData.map_zoom_start)
        }
      }
      
    } catch (err) {
      setError(err.message)
      console.error('Error loading file:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLoadOSM = async () => {
    const { routes } = useAppStore.getState()
    
    if (!routes || routes.length === 0) {
      setError('Please load event data first')
      return
    }
    
    setLoadingOSM(true)
    setError(null)
    
    try {
      // Calculate bounding box
      const bbox = calculateBBoxFromRoutes(routes, 500)
      
      if (!bbox) {
        throw new Error('Could not calculate bounding box from routes')
      }
      
      // Validate bbox
      if (bbox.length !== 4 || bbox.some(v => !isFinite(v))) {
        throw new Error('Invalid bounding box calculated')
      }
      
      console.log('Fetching OSM data for bbox:', bbox)
      
      // Fetch OSM data
      const roadNetwork = await fetchOSMRoads(bbox)
      
      if (!roadNetwork || !roadNetwork.features || roadNetwork.features.length === 0) {
        setError('No roads found in this area. Try a larger area or check your route data.')
        return
      }
      
      console.log(`Loaded ${roadNetwork.features.length} road segments from OSM`)
      setRoadNetwork(roadNetwork)
      
      // Find closure boundaries
      // Combine all route geometries into a single array of [lng, lat] coordinates
      const allRouteCoords = []
      
      routes.forEach(r => {
        if (r.geometry && Array.isArray(r.geometry) && r.geometry.length > 0) {
          // geometry is already in [lng, lat] format
          r.geometry.forEach(coord => {
            if (Array.isArray(coord) && coord.length >= 2 && 
                typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
                !isNaN(coord[0]) && !isNaN(coord[1])) {
              allRouteCoords.push(coord)
            }
          })
        } else if (r.coordinates && Array.isArray(r.coordinates) && r.coordinates.length > 0) {
          // coordinates are in [lat, lng] format, convert to [lng, lat]
          r.coordinates.forEach(c => {
            if (Array.isArray(c) && c.length >= 2 && 
                typeof c[0] === 'number' && typeof c[1] === 'number' &&
                !isNaN(c[0]) && !isNaN(c[1])) {
              allRouteCoords.push([c[1], c[0]]) // Convert [lat, lng] to [lng, lat]
            }
          })
        }
      })
      
      if (allRouteCoords.length === 0) {
        console.error('Routes structure:', routes.map(r => ({
          hasGeometry: !!r.geometry,
          geometryLength: r.geometry?.length,
          hasCoordinates: !!r.coordinates,
          coordinatesLength: r.coordinates?.length,
          firstGeometry: r.geometry?.[0],
          firstCoordinates: r.coordinates?.[0]
        })))
        throw new Error('No valid route coordinates found. Check console for route structure details.')
      }
      
      console.log(`Processing ${allRouteCoords.length} route coordinates`)
      console.log('Sample coordinates:', allRouteCoords.slice(0, 3))
      
      // Pass as a flat array of coordinates directly
      const closureAnalysis = findClosureBoundaries(allRouteCoords, roadNetwork, 50)
      
      setClosurePolygon(closureAnalysis.closurePolygon)
      setAffectedRoads(closureAnalysis.affectedRoads)
      setBoundaryPoints(closureAnalysis.boundaryPoints)
      
      console.log(`Found ${closureAnalysis.boundaryPoints.length} boundary points`)
      
    } catch (err) {
      const errorMsg = err.message || 'Unknown error loading OSM data'
      setError(errorMsg)
      console.error('Error loading OSM data:', err)
      
      // Provide helpful suggestions
      if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        setError('Invalid query to OSM API. The area might be too large. Try reducing the buffer or contact support.')
      } else if (errorMsg.includes('timeout') || errorMsg.includes('429')) {
        setError('OSM API is busy. Please try again in a few moments.')
      }
    } finally {
      setLoadingOSM(false)
    }
  }
  
  const handleGenerateRecommendations = () => {
    const { boundaryPoints, roadNetwork, pois } = useAppStore.getState()
    
    if (!boundaryPoints || boundaryPoints.length === 0) {
      setError('Please load OSM data first. Click "Load Road Network" button above.')
      return
    }
    
    if (!roadNetwork || !roadNetwork.features || roadNetwork.features.length === 0) {
      setError('Road network data is missing. Please load OSM data first.')
      return
    }
    
    try {
      const phases = getPhasesFromStore()
      
      if (phases.length === 0) {
        setError('No phases found. Please load event data first.')
        return
      }
      
      console.log(`Generating recommendations for ${boundaryPoints.length} boundary points`)
      
      const scenarios = buildScenariosForBoundaries(
        boundaryPoints,
        roadNetwork,
        pois,
        phases,
        {}
      )
      
      if (scenarios.length === 0) {
        setError('No scenarios could be built from boundary points.')
        return
      }
      
      console.log(`Built ${scenarios.length} scenarios`)
      
      const recommender = new OntarioTrafficControlRecommender()
      let totalDevices = 0
      
      scenarios.forEach(scenario => {
        const recommendations = recommender.recommend(scenario)
        recommendations.forEach(device => {
          addDevice(device)
          totalDevices++
        })
      })
      
      alert(`Success! Generated ${scenarios.length} scenarios and placed ${totalDevices} devices on the map.`)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error generating recommendations:', err)
    }
  }
  
  const visibleDevices = getDevicesByPhase(selectedPhase)
  const totalCost = visibleDevices.reduce((sum, d) => sum + calculateDeviceCost(d), 0)
  const totalDevices = visibleDevices.reduce((sum, d) => sum + (d.quantity || 1), 0)
  
  return (
    <div style={{ padding: '20px' }}>
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '12px', 
        marginBottom: '20px' 
      }}>
        <div style={{ 
          padding: '16px', 
          background: 'linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2c3e50' }}>
            {totalDevices}
          </div>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
            Total Devices
          </div>
        </div>
        <div style={{ 
          padding: '16px', 
          background: 'linear-gradient(135deg, #d5f4e6 0%, #a8e6cf 100%)',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#27ae60' }}>
            ${totalCost.toFixed(0)}
          </div>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
            Estimated Cost
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div style={{ 
        padding: '16px', 
        background: '#fff3cd', 
        borderRadius: '8px', 
        border: '1px solid #ffc107', 
        marginBottom: '20px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <AlertTriangle size={16} color="#856404" />
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#856404' }}>Tips</div>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#856404', lineHeight: '1.6' }}>
          <li>Click device palette, then click map to place devices</li>
          <li>Drag devices on map to reposition</li>
          <li>Click a device marker to edit properties</li>
        </ul>
      </div>
      
      {error && (
        <div style={{
          padding: '12px',
          background: '#fee',
          color: '#c33',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      {/* File Upload */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '13px',
          color: '#2c3e50'
        }}>
          Load Event Data (JSON/TXT)
        </label>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: '#3498db',
          color: '#fff',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s'
        }}>
          <Upload size={16} />
          {loading ? 'Loading...' : 'Choose File'}
          <input
            type="file"
            accept=".json,.txt"
            onChange={handleFileUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      
      {/* Event Info */}
      {eventData && (
        <div style={{ 
          padding: '16px', 
          background: '#fff', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Event Information</h3>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            {(() => {
              const data = Array.isArray(eventData) ? eventData[0] : eventData
              return (
                <>
                  <div><strong>Name:</strong> {data?.map_name || 'N/A'}</div>
                  <div><strong>Date:</strong> {data?.map_date || 'N/A'}</div>
                  <div><strong>Event ID:</strong> {data?.event_id || 'N/A'}</div>
                </>
              )
            })()}
          </div>
        </div>
      )}
      
      {/* Workflow Steps */}
      <div style={{ 
        padding: '16px', 
        background: '#e3f2fd', 
        borderRadius: '8px', 
        border: '1px solid #2196f3',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#1976d2', marginBottom: '12px' }}>
          Workflow Steps:
        </div>
        <div style={{ fontSize: '12px', color: '#424242', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: eventData ? '#4caf50' : '#ccc',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {eventData ? '✓' : '1'}
            </span>
            <span>Load Event Data (JSON/TXT file)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: boundaryPoints && boundaryPoints.length > 0 ? '#4caf50' : '#ccc',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {boundaryPoints && boundaryPoints.length > 0 ? '✓' : '2'}
            </span>
            <span>Load Road Network (OSM) - Finds boundary points</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: '#ccc',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              3
            </span>
            <span>Generate Recommendations - Auto-place Ontario signs</span>
          </div>
        </div>
      </div>

      {/* OSM Data Loading */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={handleLoadOSM}
          disabled={loadingOSM || !eventData}
          style={{
            width: '100%',
            padding: '12px',
            background: loadingOSM || !eventData ? '#bdc3c7' : '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loadingOSM || !eventData ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: loadingOSM || !eventData ? 'none' : '0 2px 4px rgba(52, 152, 219, 0.3)'
          }}
        >
          <Map size={16} />
          {loadingOSM ? 'Loading OSM Data...' : 'Load Road Network'}
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
          Step 2: Fetches roads and finds closure boundaries
        </div>
        {boundaryPoints && boundaryPoints.length > 0 && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: '#d4edda', 
            borderRadius: '4px',
            fontSize: '11px',
            color: '#155724'
          }}>
            ✓ Found {boundaryPoints.length} boundary points
          </div>
        )}
      </div>
      
      {/* Generate Recommendations */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleGenerateRecommendations}
          disabled={!eventData || !boundaryPoints || boundaryPoints.length === 0}
          style={{
            width: '100%',
            padding: '12px',
            background: (!eventData || !boundaryPoints || boundaryPoints.length === 0) ? '#bdc3c7' : '#27ae60',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: (!eventData || !boundaryPoints || boundaryPoints.length === 0) ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: (!eventData || !boundaryPoints || boundaryPoints.length === 0) ? 'none' : '0 2px 4px rgba(39, 174, 96, 0.3)'
          }}
        >
          <Zap size={16} />
          Generate Recommendations
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
          Step 3: Auto-place Ontario signs at all boundary points
        </div>
        {(!boundaryPoints || boundaryPoints.length === 0) && (
          <div style={{ 
            marginTop: '8px', 
            padding: '8px', 
            background: '#fff3cd', 
            borderRadius: '4px',
            fontSize: '11px',
            color: '#856404'
          }}>
            ⚠ Complete Step 2 first (Load Road Network)
          </div>
        )}
      </div>
      
      {/* Statistics */}
      <div style={{ 
        padding: '16px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
          Statistics
        </h3>
        <div style={{ fontSize: '12px', lineHeight: '1.8', color: '#7f8c8d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Routes:</span>
            <strong style={{ color: '#2c3e50' }}>{useAppStore.getState().routes.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>POIs:</span>
            <strong style={{ color: '#2c3e50' }}>{useAppStore.getState().pois.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Boundary Points:</span>
            <strong style={{ color: '#2c3e50' }}>{useAppStore.getState().boundaryPoints.length}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Devices:</span>
            <strong style={{ color: '#2c3e50' }}>{useAppStore.getState().devices.length}</strong>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        marginTop: '20px',
        padding: '16px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
          Legend
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#f39c12', border: '2px solid #fff', borderRadius: '2px' }}></div>
            <span style={{ color: '#7f8c8d' }}>Barricades</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#3498db', border: '2px solid #fff', borderRadius: '2px' }}></div>
            <span style={{ color: '#7f8c8d' }}>Signs</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#e67e22', border: '2px solid #fff', borderRadius: '2px' }}></div>
            <span style={{ color: '#7f8c8d' }}>Cones</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '3px', background: '#e74c3c' }}></div>
            <span style={{ color: '#7f8c8d' }}>Race Route</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', background: '#e74c3c', borderRadius: '50%', border: '2px solid #fff' }}></div>
            <span style={{ color: '#7f8c8d' }}>Medical/Aid</span>
          </div>
        </div>
      </div>
    </div>
  )
}
