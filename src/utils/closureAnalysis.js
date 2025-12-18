import * as turf from '@turf/turf'
// Note: pointToLineDistance might need to be imported separately in some turf versions

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
  
  // Ensure routeGeometry is a LineString or MultiLineString
  let routeLine
  if (Array.isArray(routeGeometry)) {
    // Check if it's an array of route coordinate arrays (separate routes)
    const firstElement = routeGeometry[0]
    
    if (Array.isArray(firstElement) && 
        firstElement.length > 0 && 
        Array.isArray(firstElement[0]) && 
        firstElement[0].length >= 2 &&
        typeof firstElement[0][0] === 'number') {
      // It's an array of separate route coordinate arrays: [[[lng, lat], ...], [[lng, lat], ...], ...]
      // Create a MultiLineString to keep routes separate (prevents diagonal connections)
      const validRoutes = routeGeometry
        .map(route => {
          if (!Array.isArray(route) || route.length < 2) return null
          const validCoords = route.filter(c => 
            Array.isArray(c) && 
            c.length >= 2 && 
            typeof c[0] === 'number' && 
            typeof c[1] === 'number' &&
            !isNaN(c[0]) && 
            !isNaN(c[1]) &&
            Math.abs(c[0]) <= 180 && // Valid longitude
            Math.abs(c[1]) <= 90     // Valid latitude
          )
          return validCoords.length >= 2 ? validCoords : null
        })
        .filter(route => route !== null)
      
      if (validRoutes.length === 0) {
        throw new Error('No valid route segments found')
      }
      
      if (validRoutes.length === 1) {
        // Single route - use LineString
        routeLine = turf.lineString(validRoutes[0])
      } else {
        // Multiple routes - use MultiLineString to keep them separate
        routeLine = turf.multiLineString(validRoutes)
      }
      
      console.log(`Using ${validRoutes.length} separate route(s) with ${validRoutes.reduce((sum, r) => sum + r.length, 0)} total coordinates`)
    } else if (Array.isArray(firstElement) && 
               firstElement.length >= 2 && 
               typeof firstElement[0] === 'number' && 
               typeof firstElement[1] === 'number') {
      // It's a flat array of coordinates: [[lng, lat], [lng, lat], ...]
      const validCoords = routeGeometry.filter(c => 
        Array.isArray(c) && 
        c.length >= 2 && 
        typeof c[0] === 'number' && 
        typeof c[1] === 'number' &&
        !isNaN(c[0]) && 
        !isNaN(c[1]) &&
        Math.abs(c[0]) <= 180 && // Valid longitude
        Math.abs(c[1]) <= 90     // Valid latitude
      )
      
      if (validCoords.length < 2) {
        throw new Error('Insufficient valid coordinates for route line')
      }
      
      routeLine = turf.lineString(validCoords)
      console.log(`Using single route with ${validCoords.length} coordinates`)
    } else {
      throw new Error(`Invalid route geometry format: expected array of coordinate arrays`)
    }
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
  
  // 3. Find actual intersections where roads meet, near the closure boundary
  // This ensures roads are closed at intersections, not before they touch the route
  const boundaryPoints = []
  const boundaryLine = turf.polygonToLine(closurePolygon)
  
  // First, find all road-to-road intersections within the affected area
  const roadIntersections = new Map() // key: "lng,lat", value: {roads: [], point: [lng, lat]}
  
  // Find intersections between affected roads
  for (let i = 0; i < affectedRoads.length; i++) {
    for (let j = i + 1; j < affectedRoads.length; j++) {
      try {
        const road1 = affectedRoads[i]
        const road2 = affectedRoads[j]
        const intersections = turf.lineIntersect(road1, road2)
        
        if (intersections.features && intersections.features.length > 0) {
          intersections.features.forEach(point => {
            const coord = point.geometry.coordinates
            const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`
            
            // Check if this intersection is near the closure boundary
            // Create a small buffer around the point and check if it intersects the boundary
            const pointBuffer = turf.buffer(point, 50, { units: 'meters' })
            const isNearBoundary = turf.booleanIntersects(pointBuffer, boundaryLine)
            
            // Only include intersections that are close to the closure boundary (within 50m)
            if (isNearBoundary) {
              // Approximate distance: use a small value since we're already filtering by buffer
              const distanceToBoundary = 25 // Approximate, since we filtered by 50m buffer
              if (!roadIntersections.has(key)) {
                roadIntersections.set(key, {
                  point: coord,
                  roads: [],
                  distanceToBoundary
                })
              }
              const intersection = roadIntersections.get(key)
              if (!intersection.roads.find(r => r.id === road1.properties.id)) {
                intersection.roads.push({
                  id: road1.properties.id,
                  name: road1.properties.name || 'Unnamed Road',
                  class: road1.properties.highway || 'unknown'
                })
              }
              if (!intersection.roads.find(r => r.id === road2.properties.id)) {
                intersection.roads.push({
                  id: road2.properties.id,
                  name: road2.properties.name || 'Unnamed Road',
                  class: road2.properties.highway || 'unknown'
                })
              }
            }
          })
        }
      } catch (e) {
        console.warn('Error finding road intersections:', e)
      }
    }
  }
  
  // Convert intersections to boundary points
  roadIntersections.forEach((intersection, key) => {
    // Find the road that leads into the closure (the one we need to close)
    intersection.roads.forEach(road => {
      boundaryPoints.push({
        id: `boundary-${road.id}-${key}`,
        point: intersection.point,
        road_id: road.id,
        road_name: road.name,
        road_class: road.class,
        status: 'intersection', // This is an actual intersection
        intersection_roads: intersection.roads.map(r => r.id),
        distance_to_boundary: intersection.distanceToBoundary
      })
    })
  })
  
  // Also find where roads directly cross the boundary (for dead-end roads)
  affectedRoads.forEach(road => {
    try {
      const intersections = turf.lineIntersect(road, boundaryLine)
      
      if (intersections.features && intersections.features.length > 0) {
        intersections.features.forEach((point, index) => {
          const coord = point.geometry.coordinates
          const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`
          
          // Only add if we haven't already added this as an intersection
          const isExistingIntersection = Array.from(roadIntersections.keys()).some(k => {
            const existingPoint = roadIntersections.get(k).point
            const distance = turf.distance(
              turf.point(coord),
              turf.point(existingPoint),
              { units: 'meters' }
            )
            return distance < 10 // Within 10 meters = same intersection
          })
          
          if (!isExistingIntersection) {
            boundaryPoints.push({
              id: `boundary-${road.properties.id}-direct-${index}`,
              point: coord,
              road_id: road.properties.id,
              road_name: road.properties.name || 'Unnamed Road',
              road_class: road.properties.highway || 'unknown',
              status: 'boundary', // Direct boundary crossing (dead-end or cul-de-sac)
              intersection_roads: [road.properties.id]
            })
          }
        })
      }
    } catch (e) {
      console.warn('Error finding boundary crossings for road:', road.properties.id, e)
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
