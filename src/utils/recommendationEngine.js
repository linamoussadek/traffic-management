/**
 * Traffic Control Device Recommendation Engine
 * Implements rule-based system following MUTCD/Ontario Book 7 standards
 */

export class TrafficControlRecommender {
  constructor(inventory = {}, standards = {}) {
    this.inventory = inventory
    this.standards = {
      advanceWarningDistance: 150,
      minSpeedForWarning: 50,
      highSpeedThreshold: 70,
      ...standards
    }
  }
  
  /**
   * Main recommendation method
   */
  recommend(scenarioInput) {
    if (!scenarioInput || !scenarioInput.intersection) {
      return []
    }
    
    const devices = []
    
    // Apply all rules in priority order
    devices.push(...this.applyBoundaryRules(scenarioInput))
    devices.push(...this.applyAdvanceWarningRules(scenarioInput))
    devices.push(...this.applyDetourRules(scenarioInput))
    devices.push(...this.applyCrowdControlRules(scenarioInput))
    devices.push(...this.applyChannelizationRules(scenarioInput))
    
    return this.optimizeDevicePlacement(devices, scenarioInput)
  }
  
  /**
   * Rule: Hard closure on arterial roads requires Type II barricades
   */
  applyBoundaryRules(scenario) {
    const { intersection, approaches, closure_context } = scenario
    const devices = []
    
    if (closure_context?.boundary_type === 'open_to_closed') {
      approaches.forEach(approach => {
        if (approach.status === 'open' && 
            ['primary', 'secondary', 'trunk', 'tertiary'].includes(approach.class)) {
          
          // Determine quantity based on intersection type
          let quantity = 2
          if (intersection.type === '4_way') {
            quantity = 4
          } else if (intersection.type === 'T') {
            quantity = 3
          } else if (intersection.type === 'multi_leg') {
            quantity = Math.max(4, intersection.degree)
          }
          
          devices.push({
            type: 'type_ii_barricade',
            quantity: quantity,
            location: approach.road_name || 'Road',
            offset_m: 0,
            reason: `Hard closure on ${approach.class} road`,
            confidence: 0.95,
            phase: scenario.phase || 'all',
            lat: scenario.location.lat,
            lng: scenario.location.lng
          })
        }
      })
    }
    
    return devices
  }
  
  /**
   * Rule: Advance warning signs for high-speed approaches
   */
  applyAdvanceWarningRules(scenario) {
    const { approaches, location } = scenario
    const devices = []
    
    if (!approaches) return devices
    
    approaches.forEach(approach => {
      if (approach.status === 'open' && approach.speed_est >= this.standards.minSpeedForWarning) {
        // Calculate advance warning distance based on speed
        const warningDistance = Math.max(
          this.standards.advanceWarningDistance,
          approach.speed_est * 2 // 2 seconds at speed
        )
        
        devices.push({
          type: 'road_closed_ahead_sign',
          quantity: 1,
          location: approach.road_name || 'Road',
          offset_m: -warningDistance,
          reason: `Advance warning for ${approach.speed_est} km/h approach`,
          confidence: 0.9,
          phase: scenario.phase || 'all',
          lat: location.lat,
          lng: location.lng
        })
        
        // High-speed approaches need arrow boards
        if (approach.speed_est >= this.standards.highSpeedThreshold) {
          devices.push({
            type: 'arrow_board',
            quantity: 1,
            location: approach.road_name || 'Road',
            offset_m: -warningDistance - 50,
            reason: 'High-speed traffic warning',
            confidence: 0.85,
            phase: scenario.phase || 'all',
            lat: location.lat,
            lng: location.lng
          })
        }
      }
    })
    
    return devices
  }
  
  /**
   * Rule: Detour signs at key decision points
   */
  applyDetourRules(scenario) {
    const { intersection, approaches } = scenario
    const devices = []
    
    if (intersection.type === '4_way' || intersection.type === 'T') {
      const openApproaches = approaches.filter(a => a.status === 'open')
      
      if (openApproaches.length >= 2) {
        devices.push({
          type: 'detour_sign',
          quantity: openApproaches.length,
          location: intersection.type === '4_way' ? '4-way intersection' : 'T-intersection',
          offset_m: 0,
          reason: 'Detour routing at intersection',
          confidence: 0.8,
          phase: scenario.phase || 'all',
          lat: scenario.location.lat,
          lng: scenario.location.lng
        })
      }
    }
    
    return devices
  }
  
  /**
   * Rule: Crowd control near high-traffic POIs
   */
  applyCrowdControlRules(scenario) {
    const { nearby_pois, risk, location } = scenario
    const devices = []
    
    if (!nearby_pois) return devices
    
    // High risk areas need pedestrian barricades
    if (risk === 'high' || (nearby_pois.start_m && nearby_pois.start_m < 200) ||
        (nearby_pois.finish_m && nearby_pois.finish_m < 200)) {
      
      devices.push({
        type: 'pedestrian_barricade',
        quantity: 4,
        location: 'High-traffic area',
        offset_m: 0,
        reason: 'Crowd control near event POI',
        confidence: 0.85,
        phase: scenario.phase || 'all',
        lat: location.lat,
        lng: location.lng
      })
    }
    
    // Medical stations need clear access
    if (nearby_pois.medical_m && nearby_pois.medical_m < 100) {
      devices.push({
        type: 'traffic_cone',
        quantity: 6,
        location: 'Medical station access',
        offset_m: 0,
        reason: 'Channelize access to medical station',
        confidence: 0.75,
        phase: scenario.phase || 'all',
        lat: location.lat,
        lng: location.lng
      })
    }
    
    return devices
  }
  
  /**
   * Rule: Channelization with cones for lane closures
   */
  applyChannelizationRules(scenario) {
    const { approaches, intersection } = scenario
    const devices = []
    
    approaches.forEach(approach => {
      if (approach.status === 'open' && approach.lanes > 1) {
        // Use cones to channelize multi-lane approaches
        devices.push({
          type: 'traffic_cone',
          quantity: Math.ceil(approach.lanes * 3), // 3 cones per lane
          location: approach.road_name || 'Road',
          offset_m: 0,
          reason: `Channelize ${approach.lanes}-lane approach`,
          confidence: 0.7,
          phase: scenario.phase || 'all',
          lat: scenario.location.lat,
          lng: scenario.location.lng
        })
      }
    })
    
    return devices
  }
  
  /**
   * Optimize device placement and remove duplicates
   */
  optimizeDevicePlacement(devices, scenario) {
    // Group by type and location
    const deviceMap = new Map()
    
    devices.forEach(device => {
      const key = `${device.type}-${device.lat?.toFixed(4)}-${device.lng?.toFixed(4)}`
      
      if (deviceMap.has(key)) {
        const existing = deviceMap.get(key)
        // Merge quantities if same type at same location
        existing.quantity = Math.max(existing.quantity, device.quantity)
        existing.confidence = Math.max(existing.confidence, device.confidence)
        existing.reason = `${existing.reason}; ${device.reason}`
      } else {
        deviceMap.set(key, { ...device })
      }
    })
    
    return Array.from(deviceMap.values())
  }
}

/**
 * Device cost mapping (example values)
 */
export const DEVICE_COSTS = {
  type_ii_barricade: 25.00,
  traffic_cone: 5.00,
  road_closed_ahead_sign: 15.00,
  detour_sign: 15.00,
  arrow_board: 50.00,
  pedestrian_barricade: 30.00
}

/**
 * Calculate total cost for devices
 */
export const calculateDeviceCost = (device) => {
  const unitCost = DEVICE_COSTS[device.type] || 10.00
  return unitCost * (device.quantity || 1)
}
