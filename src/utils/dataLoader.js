/**
 * Parse event data from JSON structure
 */

export const parseEventData = (jsonData) => {
  // Handle both array format (input.txt) and object format (sample JSON)
  let data = jsonData
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    data = jsonData[0]
  }
  
  // Support both structures:
  // 1. lines.route[].line_points[] (from input.txt)
  // 2. routes.line_points[] (from sample JSON)
  let routes = []
  
  if (data.lines && data.lines.route && Array.isArray(data.lines.route)) {
    // Structure from input.txt: lines.route[].line_points[]
    data.lines.route.forEach(route => {
      if (route.line_points && Array.isArray(route.line_points)) {
        const sortedPoints = route.line_points
          .map(point => ({
            lat: parseFloat(point.lat),
            lng: parseFloat(point.lng),
            sortorder: parseFloat(point.sortorder || 0)
          }))
          .sort((a, b) => a.sortorder - b.sortorder)
        
        routes.push({
          lineId: route.line_id,
          lineName: route.line_name || `Route ${route.line_id}`,
          coordinates: sortedPoints.map(p => [p.lat, p.lng]),
          geometry: sortedPoints.map(p => [p.lng, p.lat])
        })
      }
    })
  } else if (data.routes && data.routes.line_points) {
    // Structure from sample JSON: routes.line_points[]
    const linePoints = data.routes.line_points || []
    
    // Group by line_id and sort by sortorder
    const routesByLineId = {}
    
    linePoints.forEach(point => {
      const lineId = point.line_id
      if (!routesByLineId[lineId]) {
        routesByLineId[lineId] = []
      }
      
      routesByLineId[lineId].push({
        lat: parseFloat(point.lat),
        lng: parseFloat(point.lng),
        sortorder: parseFloat(point.sortorder || 0)
      })
    })
    
    // Sort each route by sortorder and convert to coordinate arrays
    routes = Object.entries(routesByLineId).map(([lineId, points]) => {
      const sortedPoints = points.sort((a, b) => a.sortorder - b.sortorder)
      return {
        lineId: parseInt(lineId),
        lineName: `Route ${lineId}`,
        coordinates: sortedPoints.map(p => [p.lat, p.lng]),
        geometry: sortedPoints.map(p => [p.lng, p.lat])
      }
    })
  } else {
    throw new Error('Invalid event data: missing routes or lines.route structure')
  }
  
  return routes
}

export const parsePOIs = (jsonData) => {
  const pois = []
  
  // Handle both array format (input.txt) and object format (sample JSON)
  let data = jsonData
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    data = jsonData[0]
  }
  
  if (!data.markers) {
    return pois
  }
  
  // Extract all marker types
  Object.entries(data.markers).forEach(([markerType, markers]) => {
    if (Array.isArray(markers)) {
      markers.forEach((marker, index) => {
        pois.push({
          id: marker.marker_points_id || marker.id || `poi-${markerType}-${index}`,
          type: markerType,
          lat: parseFloat(marker.lat || marker.latitude),
          lng: parseFloat(marker.lng || marker.longitude),
          description: marker.description || marker.marker_code || marker.name || markerType,
          code: marker.marker_code || marker.code,
          properties: marker
        })
      })
    }
  })
  
  return pois
}

export const parsePhases = (jsonData) => {
  const phases = []
  
  // Handle both array format (input.txt) and object format (sample JSON)
  let data = jsonData
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    data = jsonData[0]
  }
  
  if (!data.closure_min_minute || !data.closure_max_minute) {
    // Default phase if not specified
    return [{
      id: 'all',
      name: 'All Day',
      time: '00:00-23:59',
      startMinute: 0,
      endMinute: 1440
    }]
  }
  
  const minMinute = data.closure_min_minute
  const maxMinute = data.closure_max_minute
  
  // Generate phases (split into 4-hour windows by default)
  const phaseDuration = 240 // 4 hours in minutes
  for (let start = minMinute; start < maxMinute; start += phaseDuration) {
    const end = Math.min(start + phaseDuration, maxMinute)
    const startHour = Math.floor(start / 60).toString().padStart(2, '0')
    const startMin = (start % 60).toString().padStart(2, '0')
    const endHour = Math.floor(end / 60).toString().padStart(2, '0')
    const endMin = (end % 60).toString().padStart(2, '0')
    
    phases.push({
      id: `${startHour}:${startMin}-${endHour}:${endMin}`,
      name: `Phase ${phases.length + 1}`,
      time: `${startHour}:${startMin}-${endHour}:${endMin}`,
      startMinute: start,
      endMinute: end
    })
  }
  
  return phases
}

export const loadEventData = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)
        resolve(jsonData)
      } catch (error) {
        reject(new Error('Failed to parse JSON: ' + error.message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

export const validateEventData = (jsonData) => {
  const errors = []
  
  if (!jsonData) {
    errors.push('JSON data is empty')
    return errors
  }
  
  // Handle both array format (input.txt) and object format (sample JSON)
  let data = jsonData
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    data = jsonData[0]
  } else if (Array.isArray(jsonData) && jsonData.length === 0) {
    errors.push('JSON array is empty')
    return errors
  }
  
  // Check for routes in either structure
  const hasLinesRoute = data.lines && data.lines.route && Array.isArray(data.lines.route)
  const hasRoutesLinePoints = data.routes && data.routes.line_points && Array.isArray(data.routes.line_points)
  
  if (!hasLinesRoute && !hasRoutesLinePoints) {
    errors.push('Missing routes: expected either lines.route[] or routes.line_points[]')
  }
  
  // Validate line_points if present
  if (hasLinesRoute) {
    data.lines.route.forEach((route, routeIndex) => {
      if (!route.line_points || !Array.isArray(route.line_points)) {
        errors.push(`Route ${routeIndex} missing line_points array`)
      } else if (route.line_points.length === 0) {
        errors.push(`Route ${routeIndex} has empty line_points array`)
      } else {
        route.line_points.forEach((point, pointIndex) => {
          if (!point.lat || !point.lng) {
            errors.push(`Route ${routeIndex}, Point ${pointIndex} missing lat or lng`)
          }
          if (isNaN(parseFloat(point.lat)) || isNaN(parseFloat(point.lng))) {
            errors.push(`Route ${routeIndex}, Point ${pointIndex} has invalid coordinates`)
          }
        })
      }
    })
  } else if (hasRoutesLinePoints) {
    if (data.routes.line_points.length === 0) {
      errors.push('routes.line_points array is empty')
    }
    
    data.routes.line_points.forEach((point, index) => {
      if (!point.lat || !point.lng) {
        errors.push(`Point ${index} missing lat or lng`)
      }
      if (isNaN(parseFloat(point.lat)) || isNaN(parseFloat(point.lng))) {
        errors.push(`Point ${index} has invalid coordinates`)
      }
    })
  }
  
  return errors
}
