/**
 * Ontario Traffic Manual (OTM) Compliant Recommendation Engine
 * Implements proper sign placement sequences for road closures
 * Based on Book 5 (Regulatory Signs) and Book 7 (Temporary Conditions)
 */

import { ONTARIO_SIGNS, calculateAdvanceDistance, getSignCost } from './ontarioSigns'
import * as turf from '@turf/turf'

export class OntarioTrafficControlRecommender {
  constructor(inventory = {}, standards = {}) {
    this.inventory = inventory
    this.standards = {
      minAdvanceDistance: 150, // meters
      highSpeedThreshold: 70, // km/h
      minSpeedForWarning: 50, // km/h
      ...standards
    }
  }
  
  /**
   * Main recommendation method
   * Returns devices in proper sequence: Advance Warning -> Lane Control -> Regulatory -> Barriers
   */
  recommend(scenarioInput) {
    if (!scenarioInput || !scenarioInput.intersection) {
      return []
    }
    
    const devices = []
    const { intersection, approaches, closure_context, location } = scenarioInput
    
    // Process each open approach
    approaches.forEach(approach => {
      if (approach.status === 'open') {
        // 1. ADVANCE WARNING SIGNS (placed upstream)
        devices.push(...this.recommendAdvanceWarning(approach, location, closure_context))
        
        // 2. LANE CONTROL SIGNS (at closure point)
        devices.push(...this.recommendLaneControl(approach, intersection, location, closure_context))
        
        // 3. REGULATORY SIGNS (at intersection/closure point)
        devices.push(...this.recommendRegulatorySigns(approach, intersection, location, closure_context))
        
        // 4. TURN LANE DESIGNATION SIGNS (at intersections)
        if (intersection.type !== 'straight' && intersection.type !== 'dead_end') {
          devices.push(...this.recommendTurnLaneSigns(approach, intersection, location))
        }
      }
    })
    
    // 5. PHYSICAL BARRIERS (at closure boundary)
    devices.push(...this.recommendPhysicalBarriers(scenarioInput))
    
    // 6. CHANNELIZATION (cones/drums for lane guidance)
    devices.push(...this.recommendChannelization(scenarioInput))
    
    return this.optimizeAndSequence(devices, scenarioInput)
  }
  
  /**
   * Advance Warning Signs - placed upstream based on speed
   * Sequence: TC-67 (if major closure) -> TC-1/TC-2B -> TC-3R/TC-3L -> TC-12 (if high speed)
   */
  recommendAdvanceWarning(approach, location, closureContext) {
    const devices = []
    const speed = approach.speed_est || 50
    const roadClass = approach.class
    
    // Calculate advance distances
    const primaryDistance = calculateAdvanceDistance(speed, 200) // First warning
    const secondaryDistance = calculateAdvanceDistance(speed, 150) // Second warning
    
    // Major closure: Use TC-67 (Street Section Closed)
    if (closureContext.boundary_type === 'open_to_closed' && 
        ['primary', 'secondary', 'trunk'].includes(roadClass)) {
      devices.push({
        code: 'TC-67',
        type: 'TC-67',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -primaryDistance - 100, // Furthest upstream
        reason: 'Major closure advance warning',
        confidence: 0.95,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('TC-67')
      })
    }
    
    // TC-1 (Construction Ahead) or TC-2B (Road Work)
    const workSign = roadClass === 'primary' ? 'TC-1' : 'TC-2B'
    devices.push({
      code: workSign,
      type: workSign,
      quantity: 1,
      location: approach.road_name || 'Road',
      offset_m: -primaryDistance,
      reason: `Advance warning for ${speed} km/h traffic`,
      confidence: 0.9,
      phase: closureContext.phase || 'all',
      lat: location.lat,
      lng: location.lng,
      cost: getSignCost(workSign)
    })
    
    // Lane closure warnings (TC-3R or TC-3L)
    if (approach.lanes > 1) {
      // Determine which lane is closed (simplified: assume right lane for now)
      const laneSign = 'TC-3R' // Could be TC-3L for left lane
      devices.push({
        code: laneSign,
        type: laneSign,
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -secondaryDistance,
        reason: `Lane closure warning for ${approach.lanes}-lane road`,
        confidence: 0.85,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost(laneSign)
      })
    }
    
    // High-speed areas: Add TC-12 (Flashing Arrow Boards)
    if (speed >= this.standards.highSpeedThreshold) {
      devices.push({
        code: 'TC-12',
        type: 'TC-12',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -secondaryDistance - 50,
        reason: 'High-speed area requires flashing arrow boards',
        confidence: 0.9,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('TC-12')
      })
    }
    
    return devices
  }
  
  /**
   * Lane Control Signs - at closure point
   * TC-4L/TC-4R (Lane Closure Arrows) guide traffic around closure
   */
  recommendLaneControl(approach, intersection, location, closureContext) {
    const devices = []
    
    if (closureContext.boundary_type === 'open_to_closed') {
      // Determine merge direction based on closure side
      // Simplified: use right arrow if multiple lanes
      if (approach.lanes > 1) {
        const arrowSign = 'TC-4R' // Right arrow (traffic merges right)
        devices.push({
          code: arrowSign,
          type: arrowSign,
          quantity: Math.ceil(approach.lanes / 2), // One per closed lane
          location: approach.road_name || 'Road',
          offset_m: 0,
          reason: 'Lane closure arrow to guide traffic',
          confidence: 0.9,
          phase: closureContext.phase || 'all',
          lat: location.lat,
          lng: location.lng,
          cost: getSignCost(arrowSign)
        })
      }
    }
    
    return devices
  }
  
  /**
   * Regulatory Signs - at closure/intersection point
   * Rb-92 (Road Closed), Rb-10/11/12 (No Turn), Rb-25R/L (Keep Right/Left)
   */
  recommendRegulatorySigns(approach, intersection, location, closureContext) {
    const devices = []
    
    // Hard closure: Rb-92 (Road Closed)
    if (closureContext.boundary_type === 'open_to_closed') {
      devices.push({
        code: 'Rb-92',
        type: 'Rb-92',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: 0,
        reason: 'Road closed - regulatory sign',
        confidence: 0.95,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-92')
      })
    }
    
    // Partial closure: TC-7tB (Local Traffic Only)
    if (closureContext.boundary_type === 'partial_closure') {
      devices.push({
        code: 'TC-7tB',
        type: 'TC-7tB',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: 0,
        reason: 'Local traffic only - partial closure',
        confidence: 0.9,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('TC-7tB')
      })
    }
    
    // At intersections: Determine turn restrictions
    if (intersection.type === '4_way' || intersection.type === 'T') {
      // If closure blocks straight through
      if (closureContext.blocks_straight) {
        devices.push({
          code: 'Rb-10',
          type: 'Rb-10',
          quantity: 1,
          location: approach.road_name || 'Road',
          offset_m: 0,
          reason: 'No straight through at intersection',
          confidence: 0.85,
          phase: closureContext.phase || 'all',
          lat: location.lat,
          lng: location.lng,
          cost: getSignCost('Rb-10')
        })
      }
      
      // Keep Right/Left based on closure side
      if (approach.lanes > 1) {
        devices.push({
          code: 'Rb-25R',
          type: 'Rb-25R',
          quantity: 1,
          location: approach.road_name || 'Road',
          offset_m: 0,
          reason: 'Keep right around closure',
          confidence: 0.8,
          phase: closureContext.phase || 'all',
          lat: location.lat,
          lng: location.lng,
          cost: getSignCost('Rb-25R')
        })
      }
    }
    
    // Yield to oncoming traffic if two-way becomes one-way
    if (closureContext.creates_one_way) {
      devices.push({
        code: 'Rb-91',
        type: 'Rb-91',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: 0,
        reason: 'Yield to oncoming traffic',
        confidence: 0.85,
        phase: closureContext.phase || 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-91')
      })
    }
    
    return devices
  }
  
  /**
   * Turn Lane Designation Signs - at intersections
   * Rb-41 through Rb-47 based on available movements
   */
  recommendTurnLaneSigns(approach, intersection, location) {
    const devices = []
    
    // Determine available movements based on closure context
    // This is simplified - in reality, would analyze detour routes
    const availableMovements = this.analyzeAvailableMovements(approach, intersection)
    
    if (availableMovements.left && !availableMovements.straight && !availableMovements.right) {
      devices.push({
        code: 'Rb-41',
        type: 'Rb-41',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -30, // Before intersection
        reason: 'Left turn only lane',
        confidence: 0.8,
        phase: 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-41')
      })
    } else if (!availableMovements.left && availableMovements.straight && !availableMovements.right) {
      devices.push({
        code: 'Rb-47',
        type: 'Rb-47',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -30,
        reason: 'Straight only lane',
        confidence: 0.8,
        phase: 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-47')
      })
    } else if (availableMovements.left && availableMovements.straight && !availableMovements.right) {
      devices.push({
        code: 'Rb-43',
        type: 'Rb-43',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -30,
        reason: 'Left turn or straight lane',
        confidence: 0.8,
        phase: 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-43')
      })
    } else if (!availableMovements.left && availableMovements.straight && availableMovements.right) {
      devices.push({
        code: 'Rb-44',
        type: 'Rb-44',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -30,
        reason: 'Right turn or straight lane',
        confidence: 0.8,
        phase: 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-44')
      })
    } else if (availableMovements.left && availableMovements.straight && availableMovements.right) {
      devices.push({
        code: 'Rb-46',
        type: 'Rb-46',
        quantity: 1,
        location: approach.road_name || 'Road',
        offset_m: -30,
        reason: 'All movements permitted',
        confidence: 0.8,
        phase: 'all',
        lat: location.lat,
        lng: location.lng,
        cost: getSignCost('Rb-46')
      })
    }
    
    return devices
  }
  
  /**
   * Analyze available movements based on closure context
   */
  analyzeAvailableMovements(approach, intersection) {
    // Simplified logic - in production, would analyze detour routes
    return {
      left: true,
      straight: false, // Closure blocks straight
      right: true
    }
  }
  
  /**
   * Physical Barriers - at closure boundary
   * TC-53A (Barricades) for hard closures
   */
  recommendPhysicalBarriers(scenario) {
    const { intersection, approaches, closure_context, location } = scenario
    const devices = []
    
    if (closure_context?.boundary_type === 'open_to_closed') {
      approaches.forEach(approach => {
        if (approach.status === 'open' && 
            ['primary', 'secondary', 'trunk', 'tertiary'].includes(approach.class)) {
          
          let quantity = 2
          if (intersection.type === '4_way') {
            quantity = 4
          } else if (intersection.type === 'T') {
            quantity = 3
          }
          
          devices.push({
            code: 'TC-53A',
            type: 'TC-53A',
            quantity: quantity,
            location: approach.road_name || 'Road',
            offset_m: 0,
            reason: `Hard closure barricades on ${approach.class} road`,
            confidence: 0.95,
            phase: scenario.phase || 'all',
            lat: location.lat,
            lng: location.lng,
            cost: getSignCost('TC-53A')
          })
        }
      })
    }
    
    return devices
  }
  
  /**
   * Channelization - cones/drums to guide traffic
   * TC-51B (Cones) or TC-54 (Drums) based on speed
   */
  recommendChannelization(scenario) {
    const { approaches, location } = scenario
    const devices = []
    
    approaches.forEach(approach => {
      if (approach.status === 'open' && approach.lanes > 1) {
        const speed = approach.speed_est || 50
        // Use drums for higher speeds, cones for lower speeds
        const channelizationType = speed >= 60 ? 'TC-54' : 'TC-51B'
        const spacing = speed >= 60 ? 10 : 5 // meters
        
        // Calculate quantity based on lane length (simplified: assume 50m taper)
        const quantity = Math.ceil(50 / spacing) + approach.lanes * 3
        
        devices.push({
          code: channelizationType,
          type: channelizationType,
          quantity: quantity,
          location: approach.road_name || 'Road',
          offset_m: 0,
          reason: `Channelization for ${approach.lanes}-lane road at ${speed} km/h`,
          confidence: 0.85,
          phase: scenario.phase || 'all',
          lat: location.lat,
          lng: location.lng,
          cost: getSignCost(channelizationType)
        })
      }
    })
    
    return devices
  }
  
  /**
   * Optimize and sequence devices
   * Groups by location, removes duplicates, orders by placement sequence
   */
  optimizeAndSequence(devices, scenario) {
    // Group by location and type
    const deviceMap = new Map()
    
    devices.forEach(device => {
      const key = `${device.code}-${device.lat?.toFixed(4)}-${device.lng?.toFixed(4)}-${device.offset_m || 0}`
      
      if (deviceMap.has(key)) {
        const existing = deviceMap.get(key)
        existing.quantity = Math.max(existing.quantity, device.quantity)
        existing.confidence = Math.max(existing.confidence, device.confidence)
        existing.reason = `${existing.reason}; ${device.reason}`
      } else {
        deviceMap.set(key, { ...device })
      }
    })
    
    // Sort by offset (negative = upstream, positive = downstream)
    // This ensures advance warnings come first
    return Array.from(deviceMap.values()).sort((a, b) => {
      return (a.offset_m || 0) - (b.offset_m || 0)
    })
  }
}

/**
 * Calculate device cost using Ontario sign costs
 */
export const calculateDeviceCost = (device) => {
  const cost = device.cost || getSignCost(device.code || device.type) || 15.00
  return cost * (device.quantity || 1)
}

