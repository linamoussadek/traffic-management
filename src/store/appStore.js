import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // Data state
  eventData: null,
  routes: [],
  pois: [],
  devices: [],
  boundaryPoints: [],
  roadNetwork: null,
  closurePolygon: null,
  affectedRoads: [],
  
  // UI state
  selectedPhase: 'all',
  selectedDevice: null,
  mapCenter: [45.41, -75.70],
  mapZoom: 13,
  activeTool: null,
  
  // Inventory and settings
  inventory: {},
  standards: {
    advanceWarningDistance: 150,
    minSpeedForWarning: 50,
    highSpeedThreshold: 70
  },
  
  // Actions - Data
  setEventData: (data) => set({ eventData: data }),
  setRoutes: (routes) => set({ routes }),
  setPOIs: (pois) => set({ pois }),
  setRoadNetwork: (network) => set({ roadNetwork: network }),
  setClosurePolygon: (polygon) => set({ closurePolygon: polygon }),
  setAffectedRoads: (roads) => set({ affectedRoads: roads }),
  setBoundaryPoints: (points) => set({ boundaryPoints: points }),
  
  // Actions - Devices
  addDevice: (device) => {
    const newDevice = {
      ...device,
      id: device.id || `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }
    set((state) => ({ devices: [...state.devices, newDevice] }))
    return newDevice.id
  },
  
  updateDevice: (id, updates) => set((state) => ({
    devices: state.devices.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
  })),
  
  deleteDevice: (id) => set((state) => ({
    devices: state.devices.filter(d => d.id !== id),
    selectedDevice: state.selectedDevice?.id === id ? null : state.selectedDevice
  })),
  
  // Actions - UI
  setSelectedPhase: (phase) => set({ selectedPhase: phase }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),
  setMapCenter: (center) => set({ mapCenter: center }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  // Actions - Settings
  setInventory: (inventory) => set({ inventory }),
  setStandards: (standards) => set({ standards }),
  
  // Computed getters
  getDevicesByPhase: (phase) => {
    if (phase === 'all') return get().devices
    return get().devices.filter(d => d.phase === phase)
  },
  
  getPhases: () => {
    const { eventData } = get()
    if (!eventData) return []
    
    const phases = []
    const minMinute = eventData.closure_min_minute || 240
    const maxMinute = eventData.closure_max_minute || 960
    
    // Generate phases (example: split into 4-hour windows)
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
}))
