# Traffic Control Planning System

A web-based GIS application for planning traffic control devices for event road closures, specifically designed for Ottawa Race Weekend.

## Features

- **Interactive Map**: Leaflet-based map with OpenStreetMap tiles
- **Event Data Loading**: Import JSON event data with routes and POIs
- **Road Network Analysis**: Fetch and analyze OpenStreetMap road data
- **Closure Boundary Detection**: Automatically identify where open roads meet closed corridors
- **Device Recommendations**: Rule-based system for recommending traffic control devices
- **Manual Device Placement**: Drag-and-drop device placement on the map
- **Multi-Phase Support**: Manage devices across different time windows
- **Export**: Generate Bill of Materials (BOM) as CSV

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Build

```bash
npm run build
```

## Usage

1. **Load Event Data**: Click "Load Event Data" in the Overview tab and select a JSON file
2. **Load Road Network**: Click "Load Road Network (OSM)" to fetch OpenStreetMap data
3. **Generate Recommendations**: Click "Generate Device Recommendations" to automatically create device placements
4. **Manual Placement**: Use the device palette to manually place devices on the map
5. **Edit Devices**: Click on a device marker to edit its properties
6. **Export**: Use the Export tab to generate a Bill of Materials CSV

## Project Structure

```
src/
├── components/
│   ├── Map/          # Map components (Leaflet)
│   ├── Sidebar/       # Sidebar tabs
│   ├── Toolbar/       # Top toolbar
│   └── Panels/        # Property panels
├── utils/
│   ├── dataLoader.js      # JSON parsing
│   ├── osmLoader.js       # OpenStreetMap integration
│   ├── closureAnalysis.js # Boundary detection
│   ├── recommendationEngine.js # Device recommendations
│   ├── scenarioBuilder.js # Scenario building
│   ├── exporters.js       # CSV/PDF export
│   └── spatialIndex.js    # Spatial indexing
└── store/
    └── appStore.js        # Zustand state management
```

## Data Format

The application expects JSON files with this structure:

```json
{
  "map_id": 6,
  "map_name": "2025 Ottawa Race Weekend Sunday",
  "event_id": 5,
  "map_date": "2025-05-25",
  "closure_min_minute": 240,
  "closure_max_minute": 960,
  "markers": {
    "raceinfo": [...],
    "medical": [...]
  },
  "routes": {
    "line_points": [
      {
        "line_points_id": 242154,
        "lat": "45.41041759497522000",
        "lng": "-75.72954508699651000",
        "line_id": 168,
        "sortorder": "256.0"
      }
    ]
  }
}
```

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool
- **Leaflet** - Mapping library
- **Zustand** - State management
- **Turf.js** - Geospatial operations
- **RBush** - Spatial indexing
- **Axios** - HTTP client

## License

MIT
