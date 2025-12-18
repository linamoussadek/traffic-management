import RBush from 'rbush'
import * as turf from '@turf/turf'

/**
 * Spatial index for fast geometric queries
 */
export class SpatialIndex {
  constructor() {
    this.tree = new RBush()
  }
  
  /**
   * Index a collection of GeoJSON features
   */
  indexFeatures(features) {
    if (!Array.isArray(features)) {
      features = [features]
    }
    
    const items = features.map((feature, index) => {
      const bbox = turf.bbox(feature)
      return {
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3],
        feature: feature,
        index: index
      }
    })
    
    this.tree.load(items)
    return this
  }
  
  /**
   * Query features within a bounding box
   */
  queryBBox(bbox) {
    const [minX, minY, maxX, maxY] = bbox
    const results = this.tree.search({
      minX,
      minY,
      maxX,
      maxY
    })
    
    return results.map(item => item.feature)
  }
  
  /**
   * Query features within radius of a point
   */
  queryPoint(lng, lat, radiusMeters = 100) {
    // Convert meters to approximate degrees (rough approximation)
    // More accurate would use proper geodesic calculations
    const radiusDegrees = radiusMeters / 111000 // ~111km per degree
    
    const bbox = {
      minX: lng - radiusDegrees,
      minY: lat - radiusDegrees,
      maxX: lng + radiusDegrees,
      maxY: lat + radiusDegrees
    }
    
    const candidates = this.tree.search(bbox)
    
    // Filter by actual distance using Turf
    const center = turf.point([lng, lat])
    return candidates
      .map(item => item.feature)
      .filter(feature => {
        const distance = turf.pointToLineDistance(center, feature, { units: 'meters' })
        return distance <= radiusMeters
      })
  }
  
  /**
   * Find features that intersect with a given geometry
   */
  queryIntersects(geometry) {
    const bbox = turf.bbox(geometry)
    const candidates = this.queryBBox(bbox)
    
    // Filter by actual intersection
    return candidates.filter(feature => {
      try {
        return turf.booleanIntersects(feature, geometry)
      } catch (e) {
        return false
      }
    })
  }
  
  /**
   * Clear the index
   */
  clear() {
    this.tree.clear()
    return this
  }
}
