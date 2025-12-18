/**
 * Ontario Traffic Manual (OTM) Sign Specifications
 * Based on Book 5 (Regulatory Signs) and Book 7 (Temporary Conditions)
 */

export const ONTARIO_SIGNS = {
  // Traffic Cones & Markers
  'TC-51B': {
    code: 'TC-51B',
    name: 'Traffic Cones',
    type: 'channelization',
    description: 'Used for channelizing traffic, marking lanes, and guiding vehicles',
    placement: 'On road surface, typically 3-5 meters apart',
    cost: 5.00
  },
  'TC-54': {
    code: 'TC-54',
    name: 'Flexible Drums (Barrels)',
    type: 'channelization',
    description: 'More visible than cones, used for higher-speed areas',
    placement: 'On road surface, typically 5-10 meters apart',
    cost: 15.00
  },
  'TC-53A': {
    code: 'TC-53A',
    name: 'Barricades',
    type: 'barrier',
    description: 'Type II or Type III barricades for hard closures',
    placement: 'At closure points, blocking access',
    cost: 25.00
  },
  
  // Advance Warning Signs
  'TC-1': {
    code: 'TC-1',
    name: 'Construction Ahead',
    type: 'advance_warning',
    description: 'Warns of upcoming construction/road work',
    placement: '150-300m before work zone (based on speed)',
    minDistance: 150,
    cost: 15.00
  },
  'TC-2B': {
    code: 'TC-2B',
    name: 'Road Work',
    type: 'advance_warning',
    description: 'Indicates active road work ahead',
    placement: '100-250m before work zone',
    minDistance: 100,
    cost: 15.00
  },
  'TC-3R': {
    code: 'TC-3R',
    name: 'Right Lane Closed Ahead',
    type: 'advance_warning',
    description: 'Warns that right lane will be closed',
    placement: '150-300m before lane closure',
    minDistance: 150,
    cost: 15.00
  },
  'TC-3L': {
    code: 'TC-3L',
    name: 'Left Lane Closed Ahead',
    type: 'advance_warning',
    description: 'Warns that left lane will be closed',
    placement: '150-300m before lane closure',
    minDistance: 150,
    cost: 15.00
  },
  
  // Lane Closure & Control Signs
  'TC-4L': {
    code: 'TC-4L',
    name: 'Lane Closure Arrow (Left)',
    type: 'lane_control',
    description: 'Directs traffic to merge left',
    placement: 'At lane closure point',
    cost: 20.00
  },
  'TC-4R': {
    code: 'TC-4R',
    name: 'Lane Closure Arrow (Right)',
    type: 'lane_control',
    description: 'Directs traffic to merge right',
    placement: 'At lane closure point',
    cost: 20.00
  },
  'TC-7tA': {
    code: 'TC-7tA',
    name: 'Road Closed (Tab)',
    type: 'closure',
    description: 'Indicates road is closed ahead',
    placement: 'At closure point or advance warning',
    cost: 15.00
  },
  'TC-7tB': {
    code: 'TC-7tB',
    name: 'Local Traffic Only (Tab)',
    type: 'closure',
    description: 'Allows local access only',
    placement: 'At closure point for partial closures',
    cost: 15.00
  },
  
  // Special Information Signs
  'TC-67': {
    code: 'TC-67',
    name: 'Street Section Closed (Advance)',
    type: 'advance_warning',
    description: 'Warns of street section closure ahead',
    placement: '200-400m before closure',
    minDistance: 200,
    cost: 20.00
  },
  'PVMS': {
    code: 'PVMS',
    name: 'Portable Variable Message Sign',
    type: 'information',
    description: 'Dynamic message sign for complex situations',
    placement: 'At key decision points',
    cost: 100.00
  },
  'TC-12': {
    code: 'TC-12',
    name: 'Flashing Arrow Boards',
    type: 'advance_warning',
    description: 'High-visibility warning with flashing arrows',
    placement: '150-300m before closure (high-speed areas)',
    minDistance: 150,
    cost: 50.00
  },
  
  // Regulatory Signs
  'Rb-91': {
    code: 'Rb-91',
    name: 'Yield to Oncoming Traffic',
    type: 'regulatory',
    description: 'Requires yielding to oncoming traffic',
    placement: 'At intersections with modified traffic flow',
    cost: 15.00
  },
  'Rb-92': {
    code: 'Rb-92',
    name: 'Road Closed',
    type: 'regulatory',
    description: 'Prohibits entry - road is closed',
    placement: 'At closure point',
    cost: 15.00
  },
  'Rb-10': {
    code: 'Rb-10',
    name: 'No Straight Through',
    type: 'regulatory',
    description: 'Prohibits straight-through movement',
    placement: 'At intersection approach',
    cost: 15.00
  },
  'Rb-11': {
    code: 'Rb-11',
    name: 'No Right Turn',
    type: 'regulatory',
    description: 'Prohibits right turn',
    placement: 'At intersection approach',
    cost: 15.00
  },
  'Rb-12': {
    code: 'Rb-12',
    name: 'No Left Turn',
    type: 'regulatory',
    description: 'Prohibits left turn',
    placement: 'At intersection approach',
    cost: 15.00
  },
  'Rb-25R': {
    code: 'Rb-25R',
    name: 'Keep Right',
    type: 'regulatory',
    description: 'Directs traffic to keep right',
    placement: 'Before obstructions or lane closures',
    cost: 15.00
  },
  'Rb-25L': {
    code: 'Rb-25L',
    name: 'Keep Left',
    type: 'regulatory',
    description: 'Directs traffic to keep left',
    placement: 'Before obstructions or lane closures',
    cost: 15.00
  },
  
  // Turn Lane Designation Signs
  'Rb-41': {
    code: 'Rb-41',
    name: 'Left Turn Only',
    type: 'lane_designation',
    description: 'Lane restricted to left turns only',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-42': {
    code: 'Rb-42',
    name: 'Right Turn Only',
    type: 'lane_designation',
    description: 'Lane restricted to right turns only',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-43': {
    code: 'Rb-43',
    name: 'Left Turn or Straight',
    type: 'lane_designation',
    description: 'Lane allows left turn or straight through',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-44': {
    code: 'Rb-44',
    name: 'Right Turn or Straight',
    type: 'lane_designation',
    description: 'Lane allows right turn or straight through',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-45': {
    code: 'Rb-45',
    name: 'Left or Right Turn Only',
    type: 'lane_designation',
    description: 'Lane restricted to left or right turns',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-46': {
    code: 'Rb-46',
    name: 'All Movements Permitted',
    type: 'lane_designation',
    description: 'All movements allowed (left, straight, right)',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  },
  'Rb-47': {
    code: 'Rb-47',
    name: 'Straight Only',
    type: 'lane_designation',
    description: 'Lane restricted to straight-through only',
    placement: 'Above or beside lane, before intersection',
    cost: 20.00
  }
}

/**
 * Calculate advance warning distance based on speed
 * Formula: Distance = Speed (km/h) × 2 seconds + buffer
 */
export const calculateAdvanceDistance = (speedKmh, minDistance = 150) => {
  // Convert speed to m/s, multiply by 2 seconds, add buffer
  const distance = Math.max(minDistance, (speedKmh / 3.6) * 2 + 50)
  return Math.round(distance)
}

/**
 * Get sign cost
 */
export const getSignCost = (signCode) => {
  return ONTARIO_SIGNS[signCode]?.cost || 15.00
}

