import * as turf from '@turf/turf'

/**
 * Find closure boundaries where open roads meet closed corridors
 */
export const findClosureBoundaries = (routeGeometry, roadNetwork, bufferMeters = 50) => {
  if (!routeGeometry || !roadNetwork || roadNetwork.features.length === 0) {
    return {
      closurePolygon: null,
      affectedRoads: [],
      boundaryPoints: []
    }
  }
  
  // Ensure routeGeometry is a LineString
  let routeLine
  if (Array.isArray(routeGeometry)) {
    // Check if it's a flat array of coordinates: [[lng, lat], [lng, lat], ...]
    // or an array of route objects
    let allCoords = []
    
    // First check: is the first element a coordinate array (has 2 numbers)?
    const firstElement = routeGeometry[0]
    if (Array.isArray(firstElement) && 
        firstElement.length >= 2 && 
        typeof firstElement[0] === 'number' && 
        typeof firstElement[1] === 'number') {
      // It's a flat array of coordinates: [[lng, lat], [lng, lat], ...]
      allCoords = routeGeometry.filter(c => 
        Array.isArray(c) && 
        c.length >= 2 && 
        typeof c[0] === 'number' && 
        typeof c[1] === 'number' &&
        !isNaN(c[0]) && 
        !isNaN(c[1]) &&
        Math.abs(c[0]) <= 180 && // Valid longitude
        Math.abs(c[1]) <= 90     // Valid latitude
      )
    } else {
      // It's an array of route objects
      routeGeometry.forEach(route => {
        if (Array.isArray(route)) {
          // It's a coordinate array directly: [[lng, lat], [lng, lat], ...]
          allCoords.push(...route.filter(c => 
            Array.isArray(c) && 
            c.length >= 2 && 
            typeof c[0] === 'number' && 
            typeof c[1] === 'number' &&
            !isNaN(c[0]) && 
            !isNaN(c[1])
          ))
        } else if (route && route.geometry && Array.isArray(route.geometry)) {
          // Route has geometry array: [lng, lat] format
          allCoords.push(...route.geometry.filter(c => 
            Array.isArray(c) && 
            c.length >= 2 && 
            typeof c[0] === 'number' && 
            typeof c[1] === 'number' &&
            !isNaN(c[0]) && 
            !isNaN(c[1])
          ))
        } else if (route && route.coordinates && Array.isArray(route.coordinates)) {
          // Route has coordinates: need to check format
          const coords = route.coordinates.map(c => {
            if (Array.isArray(c) && c.length >= 2 && 
                typeof c[0] === 'number' && typeof c[1] === 'number' &&
                !isNaN(c[0]) && !isNaN(c[1])) {
              // Check if it's [lat, lng] or [lng, lat]
              // If first value > 90 or < -90, it's likely lng, otherwise assume lat
              if (Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180) {
                // Likely [lat, lng], convert to [lng, lat]
                return [c[1], c[0]]
              }
              // Already [lng, lat]
              return c
            }
            return null
          }).filter(c => c !== null)
          allCoords.push(...coords)
        }
      })
    }
    
    if (allCoords.length === 0) {
      console.error('Route geometry structure:', {
        length: routeGeometry.length,
        firstElement: routeGeometry[0],
        firstElementType: typeof routeGeometry[0],
        firstElementIsArray: Array.isArray(routeGeometry[0])
      })
      throw new Error('No valid coordinates found in route geometry. Check console for details.')
    }
    
    // Final validation: ensure all coordinates are valid [lng, lat] pairs
    const validCoords = allCoords.filter(c => 
      Array.isArray(c) && 
      c.length >= 2 && 
      typeof c[0] === 'number' && 
      typeof c[1] === 'number' &&
      !isNaN(c[0]) && 
      !isNaN(c[1]) &&
      Math.abs(c[0]) <= 180 && // Valid longitude
      Math.abs(c[1]) <= 90     // Valid latitude
    )
    
    if (validCoords.length === 0) {
      console.error('Filtered coordinates sample:', allCoords.slice(0, 5))
      throw new Error(`No valid coordinates after filtering. Had ${allCoords.length} coordinates before filtering. Check console for details.`)
    }
    
    console.log(`Using ${validCoords.length} valid coordinates for closure analysis`)
    routeLine = turf.lineString(validCoords)
  } else if (routeGeometry.type === 'LineString') {
    routeLine = turf.feature({ type: 'LineString', coordinates: routeGeometry.coordinates })
  } else if (routeGeometry.type === 'Feature' && routeGeometry.geometry.type === 'LineString') {
    routeLine = routeGeometry
  } else {
    throw new Error(`Invalid route geometry format: ${JSON.stringify(routeGeometry).substring(0, 100)}`)
  }
  
  // Validate routeLine before buffering
  // turf.lineString returns a Feature, so check geometry.coordinates
  const coords = routeLine.geometry?.coordinates || routeLine.coordinates
  if (!routeLine || !coords || coords.length < 2) {
    console.error('Route line validation failed:', {
      hasRouteLine: !!routeLine,
      hasGeometry: !!routeLine.geometry,
      hasCoordinates: !!routeLine.coordinates,
      geometryType: routeLine.geometry?.type,
      coordsLength: coords?.length,
      sampleCoords: coords?.slice(0, 3)
    })
    throw new Error(`Route line is invalid or has insufficient coordinates. Found ${coords?.length || 0} coordinates.`)
  }
  
  // 1. Create closure polygon (buffer around route)
  // turf.buffer expects a Feature, which turf.lineString returns
  const closurePolygon = turf.buffer(routeLine, bufferMeters, { units: 'meters' })
  
  // 2. Find roads that intersect closure boundary
  const affectedRoads = roadNetwork.features.filter(road => {
    try {
      return turf.booleanIntersects(road, closurePolygon)
    } catch (e) {
      return false
    }
  })
  
  // 3. Find intersection points where roads cross closure boundary
  const boundaryPoints = []
  const boundaryLine = turf.polygonToLine(closurePolygon)
  
  affectedRoads.forEach(road => {
    try {
      const intersections = turf.lineIntersect(road, boundaryLine)
      
      if (intersections.features && intersections.features.length > 0) {
        intersections.features.forEach((point, index) => {
          boundaryPoints.push({
            id: `boundary-${road.properties.id}-${index}`,
            point: point.geometry.coordinates, // [lng, lat]
            road_id: road.properties.id,
            road_name: road.properties.name || 'Unnamed Road',
            road_class: road.properties.highway || 'unknown',
            status: 'boundary' // This is where open meets closed
          })
        })
      }
    } catch (e) {
      console.warn('Error finding intersections for road:', road.properties.id, e)
    }
  })
  
  // Remove duplicate boundary points (within 10 meters)
  const uniqueBoundaryPoints = []
  boundaryPoints.forEach(point => {
    const isDuplicate = uniqueBoundaryPoints.some(existing => {
      const distance = turf.distance(
        turf.point(point.point),
        turf.point(existing.point),
        { units: 'meters' }
      )
      return distance < 10
    })
    
    if (!isDuplicate) {
      uniqueBoundaryPoints.push(point)
    }
  })
  
  return {
    closurePolygon,
    affectedRoads,
    boundaryPoints: uniqueBoundaryPoints
  }
}

/**
 * Analyze intersection topology at a boundary point
 */
export const analyzeIntersectionTopology = (boundaryPoint, roadNetwork, radius = 100) => {
  if (!boundaryPoint || !roadNetwork) {
    return null
  }
  
  const center = turf.point(boundaryPoint.point)
  const searchArea = turf.buffer(center, radius, { units: 'meters' })
  
  // Find all roads within radius
  const nearbyRoads = roadNetwork.features.filter(road => {
    try {
      return turf.booleanIntersects(road, searchArea)
    } catch (e) {
      return false
    }
  })
  
  // Extract approach information
  const approaches = nearbyRoads.map(road => {
    // Estimate speed based on road class
    const speedMap = {
      'motorway': 100,
      'trunk': 90,
      'primary': 70,
      'secondary': 60,
      'tertiary': 50,
      'residential': 40,
      'unclassified': 50
    }
    
    return {
      road_id: road.properties.id,
      road_name: road.properties.name || 'Unnamed Road',
      class: road.properties.highway || 'unknown',
      oneway: road.properties.oneway === 'yes',
      lanes: parseInt(road.properties.lanes) || 1,
      maxspeed: parseInt(road.properties.maxspeed) || speedMap[road.properties.highway] || 50,
      speed_est: parseInt(road.properties.maxspeed) || speedMap[road.properties.highway] || 50
    }
  })
  
  // Classify intersection type
  const degree = approaches.length
  let intersectionType
  if (degree === 1) {
    intersectionType = 'dead_end'
  } else if (degree === 2) {
    intersectionType = 'straight'
  } else if (degree === 3) {
    intersectionType = 'T'
  } else if (degree === 4) {
    intersectionType = '4_way'
  } else {
    intersectionType = 'multi_leg'
  }
  
  // Determine which approaches are open vs closed
  const approachesWithStatus = approaches.map(approach => ({
    ...approach,
    status: 'open' // Default to open, can be enhanced with closure logic
  }))
  
  return {
    type: intersectionType,
    degree,
    approaches: approachesWithStatus,
    center: boundaryPoint.point
  }
}

/**
 * Build complete scenario for a boundary point
 */
export const buildScenarioForBoundaryPoint = (
  boundaryPoint,
  intersection,
  pois = [],
  closureContext = {},
  detourData = null
) => {
  // Calculate distances to nearby POIs
  const boundaryPointGeo = turf.point(boundaryPoint.point)
  
  const nearby_pois = {}
  
  // Find start/finish POIs
  const startPOI = pois.find(p => p.type === 'raceinfo' && p.description?.toLowerCase().includes('start'))
  const finishPOI = pois.find(p => p.type === 'raceinfo' && p.description?.toLowerCase().includes('finish'))
  
  if (startPOI) {
    nearby_pois.start_m = turf.distance(
      boundaryPointGeo,
      turf.point([startPOI.lng, startPOI.lat]),
      { units: 'meters' }
    )
  }
  
  if (finishPOI) {
    nearby_pois.finish_m = turf.distance(
      boundaryPointGeo,
      turf.point([finishPOI.lng, finishPOI.lat]),
      { units: 'meters' }
    )
  }
  
  // Find nearest medical and water station
  const medicalPOIs = pois.filter(p => p.type === 'medical')
  const waterPOIs = pois.filter(p => p.type === 'waterstation' || p.description?.toLowerCase().includes('water'))
  
  if (medicalPOIs.length > 0) {
    const distances = medicalPOIs.map(poi => ({
      poi,
      distance: turf.distance(
        boundaryPointGeo,
        turf.point([poi.lng, poi.lat]),
        { units: 'meters' }
      )
    }))
    const nearest = distances.reduce((min, curr) => curr.distance < min.distance ? curr : min)
    nearby_pois.medical_m = nearest.distance
  }
  
  if (waterPOIs.length > 0) {
    const distances = waterPOIs.map(poi => ({
      poi,
      distance: turf.distance(
        boundaryPointGeo,
        turf.point([poi.lng, poi.lat]),
        { units: 'meters' }
      )
    }))
    const nearest = distances.reduce((min, curr) => curr.distance < min.distance ? curr : min)
    nearby_pois.waterstation_m = nearest.distance
  }
  
  // Assess risk based on intersection complexity and POI proximity
  let risk = 'low'
  if (intersection.degree >= 4) {
    risk = 'high'
  } else if (intersection.degree === 3) {
    risk = 'medium'
  }
  
  // Increase risk if near high-traffic POIs
  if (nearby_pois.start_m && nearby_pois.start_m < 200) {
    risk = 'high'
  }
  if (nearby_pois.finish_m && nearby_pois.finish_m < 200) {
    risk = 'high'
  }
  
  return {
    phase: closureContext.phase || 'all',
    location: {
      lat: boundaryPoint.point[1],
      lng: boundaryPoint.point[0],
      node_id: boundaryPoint.road_id
    },
    intersection: intersection,
    approaches: intersection.approaches,
    closure_context: {
      ...closureContext,
      boundary_type: 'open_to_closed'
    },
    detour: detourData,
    nearby_pois: nearby_pois,
    risk: risk,
    constraints: {
      inventory: {},
      preferences: {}
    }
  }
}
