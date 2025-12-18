import { calculateDeviceCost } from './ontarioRecommendationEngine'
import { ONTARIO_SIGNS } from './ontarioSigns'

/**
 * Generate detailed Bill of Materials
 */
export const generateDetailedBOM = (devices, phases, eventData) => {
  // Group by phase and device type
  const bomByPhase = {}
  
  phases.forEach(phase => {
    const phaseDevices = devices.filter(d => d.phase === phase.id || d.phase === 'all')
    const summary = {}
    
    phaseDevices.forEach(device => {
      const deviceKey = device.code || device.type
      if (!summary[deviceKey]) {
        const unitCost = calculateDeviceCost({ ...device, quantity: 1 })
        summary[deviceKey] = {
          quantity: 0,
          locations: [],
          totalCost: 0,
          unitCost: unitCost
        }
      }
      
      summary[deviceKey].quantity += device.quantity || 1
      summary[deviceKey].locations.push({
        lat: device.lat,
        lng: device.lng,
        quantity: device.quantity || 1
      })
      summary[deviceKey].totalCost += calculateDeviceCost(device)
    })
    
    bomByPhase[phase.id] = summary
  })
  
  // Also include "all" phase devices
  const allPhaseDevices = devices.filter(d => d.phase === 'all')
  if (allPhaseDevices.length > 0) {
    const summary = {}
    allPhaseDevices.forEach(device => {
      const deviceKey = device.code || device.type
      if (!summary[deviceKey]) {
        const unitCost = calculateDeviceCost({ ...device, quantity: 1 })
        summary[deviceKey] = {
          quantity: 0,
          locations: [],
          totalCost: 0,
          unitCost: unitCost
        }
      }
      summary[deviceKey].quantity += device.quantity || 1
      summary[deviceKey].locations.push({
        lat: device.lat,
        lng: device.lng,
        quantity: device.quantity || 1
      })
      summary[deviceKey].totalCost += calculateDeviceCost(device)
    })
    bomByPhase['all'] = summary
  }
  
  // Generate CSV
  let csv = 'Event,Phase,Ontario Code,Sign Name,Quantity,Unit Cost,Total Cost,Locations\n'
  
  Object.entries(bomByPhase).forEach(([phaseId, summary]) => {
    const phase = phases.find(p => p.id === phaseId) || { id: phaseId, name: 'All Phases', time: 'All Day' }
    Object.entries(summary).forEach(([code, data]) => {
      const signInfo = ONTARIO_SIGNS[code]
      const signName = signInfo ? signInfo.name : code.replace(/_/g, ' ')
      const locationStr = data.locations
        .map(l => l.lat && l.lng ? `${l.lat.toFixed(5)},${l.lng.toFixed(5)}` : 'N/A')
        .join('; ')
      csv += `"${eventData?.map_name || 'Event'}","${phase.time}","${code}","${signName}",${data.quantity},$${data.unitCost.toFixed(2)},$${data.totalCost.toFixed(2)},"${locationStr}"\n`
    })
  })
  
  return csv
}

/**
 * Download BOM as CSV file
 */
export const downloadBOM = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate PDF deployment map (requires html2canvas and jspdf)
 */
export const generateDeploymentMap = async (mapElement, devices, phase) => {
  try {
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    
    const canvas = await html2canvas(mapElement, {
      useCORS: true,
      logging: false
    })
    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF('landscape', 'mm', 'a4')
    const imgWidth = 280
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
    
    // Add device legend
    let yPos = imgHeight + 20
    pdf.setFontSize(14)
    pdf.text('Device Legend', 10, yPos)
    
    yPos += 10
    pdf.setFontSize(10)
    
    const deviceSummary = {}
    devices.filter(d => d.phase === phase || phase === 'all').forEach(d => {
      deviceSummary[d.type] = (deviceSummary[d.type] || 0) + (d.quantity || 1)
    })
    
    Object.entries(deviceSummary).forEach(([type, qty]) => {
      pdf.text(`${type}: ${qty} units`, 10, yPos)
      yPos += 6
    })
    
    pdf.save(`deployment-map-${phase || 'all'}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Error generating PDF. Make sure html2canvas and jspdf are installed.')
  }
}
