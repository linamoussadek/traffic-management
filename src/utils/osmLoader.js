import axios from 'axios'
import * as turf from '@turf/turf'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

/**
 * Fetch road network data from OpenStreetMap using Overpass API
 */
export const fetchOSMRoads = async (bbox, options = {}) => {
  const {
    highwayTypes = ['primary', 'secondary', 'tertiary', 'trunk', 'residential', 'unclassified'],
    excludeTypes = ['footway', 'path', 'cycleway', 'steps', 'pedestrian'],
    timeout = 25
  } = options
  
  // bbox format: [minLng, minLat, maxLng, maxLat]
  // Overpass expects: (south, west, north, east) = (minLat, minLng, maxLat, maxLng)
  const [minLng, minLat, maxLng, maxLat] = bbox
  
  // Build Overpass QL query - simplified and more reliable
  // Query all highways except excluded types within bounding box
  // Overpass bbox format: (south, west, north, east)
  const query = `[out:json][timeout:${timeout}];
(
  way["highway"~"^(${highwayTypes.join('|')})$"]
    (${minLat},${minLng},${maxLat},${maxLng});
);
out body;
>;
out skel qt;`
  
  try {
    const response = await axios.post(OVERPASS_API, query, {
      headers: {
        'Content-Type': 'text/plain'
      }
    })
    
    if (!response.data || !response.data.elements) {
      console.warn('OSM API returned empty or invalid data')
      return {
        type: 'FeatureCollection',
        features: []
      }
    }
    
    const processed = processOSMData(response.data)
    
    // Filter out excluded types after processing
    const filtered = {
      ...processed,
      features: processed.features.filter(feature => {
        const highway = feature.properties.highway
        return !excludeTypes.includes(highway)
      })
    }
    
    return filtered
  } catch (error) {
    console.error('Error fetching OSM data:', error)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      // Try to extract error message from Overpass API
      if (error.response.data && typeof error.response.data === 'string') {
        const errorMatch = error.response.data.match(/<p><strong>Error:<\/strong>\s*(.+?)<\/p>/)
        if (errorMatch) {
          throw new Error(`OSM API Error: ${errorMatch[1]}`)
        }
      }
    }
    throw new Error(`Failed to fetch OSM data: ${error.response?.data?.error || error.message}`)
  }
}

/**
 * Process raw OSM data into GeoJSON format
 */
export const processOSMData = (osmData) => {
  if (!osmData || !osmData.elements) {
    throw new Error('Invalid OSM data format')
  }
  
  const nodes = {}
  const ways = []
  
  // First pass: collect nodes
  osmData.elements.forEach(element => {
    if (element.type === 'node') {
      nodes[element.id] = [element.lon, element.lat]
    }
  })
  
  // Second pass: build ways (roads)
  osmData.elements.forEach(element => {
    if (element.type === 'way' && element.nodes) {
      const coordinates = element.nodes
        .map(nodeId => nodes[nodeId])
        .filter(coord => coord !== undefined)
      
      if (coordinates.length >= 2) {
        ways.push({
          type: 'Feature',
          properties: {
            id: element.id,
            name: element.tags?.name || 'Unnamed Road',
            highway: element.tags?.highway || 'unknown',
            lanes: element.tags?.lanes ? parseInt(element.tags.lanes) : null,
            maxspeed: element.tags?.maxspeed ? parseInt(element.tags.maxspeed) : null,
            oneway: element.tags?.oneway === 'yes',
            surface: element.tags?.surface || null,
            ...element.tags
          },
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        })
      }
    }
  })
  
  return {
    type: 'FeatureCollection',
    features: ways
  }
}

/**
 * Calculate bounding box from route geometry
 */
export const calculateBBoxFromRoutes = (routes, bufferMeters = 500) => {
  if (!routes || routes.length === 0) {
    return null
  }
  
  // Collect all coordinates
  const allCoords = []
  routes.forEach(route => {
    if (route.geometry) {
      allCoords.push(...route.geometry)
    } else if (route.coordinates) {
      // Convert [lat, lng] to [lng, lat]
      allCoords.push(...route.coordinates.map(c => [c[1], c[0]]))
    }
  })
  
  if (allCoords.length === 0) {
    return null
  }
  
  // Create a temporary feature collection for buffering
  const routeLine = turf.lineString(allCoords)
  const buffered = turf.buffer(routeLine, bufferMeters, { units: 'meters' })
  const bbox = turf.bbox(buffered)
  
  return bbox
}
