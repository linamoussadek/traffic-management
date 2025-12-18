import { analyzeIntersectionTopology, buildScenarioForBoundaryPoint } from './closureAnalysis'

/**
 * Build recommendation scenarios for all boundary points
 */
export const buildScenariosForBoundaries = (boundaryPoints, roadNetwork, pois, phases, closureContext = {}) => {
  const scenarios = []
  
  boundaryPoints.forEach(boundaryPoint => {
    // Analyze intersection topology
    const intersection = analyzeIntersectionTopology(boundaryPoint, roadNetwork, 100)
    
    if (!intersection) {
      return
    }
    
    // Build scenario for each phase
    phases.forEach(phase => {
      const scenario = buildScenarioForBoundaryPoint(
        boundaryPoint,
        intersection,
        pois,
        {
          ...closureContext,
          phase: phase.id
        },
        null // detourData - can be enhanced later
      )
      
      scenarios.push(scenario)
    })
  })
  
  return scenarios
}

/**
 * Calculate distance between two points
 */
export const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return null
  
  const R = 6371e3 // Earth radius in meters
  const φ1 = (point1.lat || point1[1]) * Math.PI / 180
  const φ2 = (point2.lat || point2[1]) * Math.PI / 180
  const Δφ = ((point2.lat || point2[1]) - (point1.lat || point1[1])) * Math.PI / 180
  const Δλ = ((point2.lng || point2[0]) - (point1.lng || point1[0])) * Math.PI / 180
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  
  return R * c
}

/**
 * Find POI by type and description
 */
export const findPOI = (pois, searchTerm) => {
  return pois.find(poi => 
    poi.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poi.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
}

/**
 * Find nearest POI of a specific type
 */
export const findNearestPOI = (pois, type, referencePoint) => {
  const filteredPOIs = pois.filter(poi => poi.type === type)
  
  if (filteredPOIs.length === 0) return null
  
  const distances = filteredPOIs.map(poi => ({
    poi,
    distance: calculateDistance(
      referencePoint,
      { lat: poi.lat, lng: poi.lng }
    )
  }))
  
  const nearest = distances.reduce((min, curr) => 
    curr.distance < min.distance ? curr : min
  )
  
  return nearest.poi
}

/**
 * Assess risk level for a location
 */
export const assessRisk = (location, pois, intersection) => {
  let riskScore = 0
  
  // Base risk from intersection complexity
  if (intersection.degree >= 4) riskScore += 3
  else if (intersection.degree === 3) riskScore += 2
  else riskScore += 1
  
  // Increase risk near high-traffic POIs
  pois.forEach(poi => {
    const distance = calculateDistance(location, { lat: poi.lat, lng: poi.lng })
    if (distance && distance < 200) {
      if (poi.type === 'raceinfo') riskScore += 2
      if (poi.type === 'medical') riskScore += 1
    }
  })
  
  // Classify risk
  if (riskScore >= 5) return 'high'
  if (riskScore >= 3) return 'medium'
  return 'low'
}
