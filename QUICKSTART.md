# Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will open at `http://localhost:3000`

## Basic Workflow

### 1. Load Event Data

1. Open the **Overview** tab in the sidebar
2. Click "Load Event Data (JSON)" and select your event JSON file
   - A sample file is available at `public/sample-data/ottawa-race-weekend-sample.json`
3. The routes and POIs will be displayed on the map

### 2. Load Road Network

1. Still in the **Overview** tab
2. Click "Load Road Network (OSM)"
3. This will:
   - Fetch road network data from OpenStreetMap
   - Identify closure boundaries
   - Find affected roads

### 3. Generate Recommendations

1. Click "Generate Device Recommendations"
2. The system will automatically:
   - Analyze each boundary point
   - Apply rule-based recommendations
   - Place devices on the map

### 4. Manual Device Placement

1. Select a phase from the dropdown (or "All Phases")
2. Click a device type in the toolbar (e.g., 🚧 Type II Barricade)
3. Click on the map where you want to place the device
4. The device will be added at that location

### 5. Edit Devices

1. Click on any device marker on the map
2. Use the popup to edit or delete
3. Or use the **Devices** tab to see all devices
4. Click a device in the list to open the properties panel

### 6. Export

1. Go to the **Export** tab
2. Click "Export BOM (CSV)" to download a Bill of Materials
3. The CSV includes:
   - Device types and quantities
   - Costs
   - Locations
   - Phase information

## Features

- **Interactive Map**: Pan, zoom, and interact with Leaflet map
- **Multi-Phase Support**: Manage devices across different time windows
- **Drag & Drop**: Move devices by dragging markers
- **Cost Calculation**: Automatic cost calculation for all devices
- **Filtering**: Filter devices by phase
- **Export**: Generate detailed BOM reports

## Troubleshooting

### Map not loading
- Check browser console for errors
- Ensure you have an internet connection (for OpenStreetMap tiles)

### OSM data not loading
- The Overpass API may be rate-limited
- Try again after a few seconds
- Check browser console for API errors

### Devices not appearing
- Check the phase filter - devices may be in a different phase
- Ensure devices have valid lat/lng coordinates

## Next Steps

- Customize device costs in `src/utils/recommendationEngine.js`
- Adjust recommendation rules in the same file
- Add more device types as needed
- Integrate with backend API (Phase 6)
