// frontend/src/components/RouteMap.js
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

// Fix default markers (Leaflet + React issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for different transport modes
const createCustomIcon = (color, symbol, size = 30) => {
  const fontSize = (size * 0.53).toFixed(2);
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize}px;
      color: white;
      font-weight: bold;
    ">${symbol}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

// Transport mode styling
const transportStyles = {
  truck: {
    color: '#2563eb', // Blue
    weight: 4,
    opacity: 0.8,
    dashArray: null,
    icon: '🚛'
  },
  rail: {
    color: '#dc2626', // Red
    weight: 6,
    opacity: 0.7,
    dashArray: '10, 5',
    icon: '🚂'
  },
  
  };

// Add this function after the imports (around line 50):
const generateCurvedPath = (start, end, transportMode) => {
  if (!start || !end) return [start, end].filter(Boolean);
  
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  
  // Calculate midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  
  // Add curvature based on transport mode and distance
  const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  let curveOffset = distance * 0.3; // Base curve
  
  // Mode-specific routing adjustments
  if (transportMode === 'rail') {
    // Rail follows network topology
    curveOffset = distance * 0.25;
  } else if (transportMode === 'truck') {
    // Trucks follow highways
    curveOffset = distance * 0.15;
  }
  
  // Create curved path with multiple waypoints
  const waypoints = [];
  const segments = 8; // Number of curve segments
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    
    // Bezier curve calculation
    const lat = lat1 + t * (lat2 - lat1) + Math.sin(t * Math.PI) * curveOffset;
    const lng = lng1 + t * (lng2 - lng1) + Math.cos(t * Math.PI) * curveOffset * 0.5;
    
    waypoints.push([lat, lng]);
  }
  
  return waypoints;
};

// Decode an encoded polyline string into an array of [lat, lng] coordinates
const decodePolyline = (encoded) => {
  if (!encoded) return [];

  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push([lat * 1e-5, lng * 1e-5]);
  }

  return coordinates;
};


// Generic coastal paths used when no specific route exists
const coastalPaths = {
  west: [
    [32.7157, -117.1611],
    [33.7292, -118.2620],
    [36.6002, -121.8947],
    [39.1612, -123.7881],
    [43.3504, -124.3738],
    [46.2816, -124.0833],
    [47.6062, -122.3321]
  ],
  gulf: [
    [29.7050, -95.0030],
    [29.4724, -94.0572],
    [29.9511, -90.0715],
    [30.6944, -88.0431],
    [27.9506, -82.4572]
  ],
  east: [
    [25.7617, -80.1918],
    [30.3322, -81.6557],
    [32.0835, -81.0998],
    [33.8734, -78.8808],
    [35.2271, -75.5449],
    [36.8468, -76.2852],
    [40.7128, -74.0060],
    [42.3601, -71.0589]
  ]
};

// Build a simple coastal fallback between two coordinates
const generateCoastalFallback = (start, end) => {
  if (!start || !end) return [];

  const paths = Object.values(coastalPaths);

  const calcDist = (a, b) => L.latLng(a[0], a[1]).distanceTo(L.latLng(b[0], b[1]));

  let bestPath = paths[0];
  let bestScore = Infinity;

  paths.forEach(path => {
    const score = calcDist(start, path[0]) + calcDist(end, path[path.length - 1]);
    if (score < bestScore) {
      bestScore = score;
      bestPath = path;
    }
  });

  const nearestIndex = (coords, path) => {
    let idx = 0;
    let min = Infinity;
    path.forEach((p, i) => {
      const d = calcDist(coords, p);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    return idx;
  };

  const startIdx = nearestIndex(start, bestPath);
  const endIdx = nearestIndex(end, bestPath);

  let slice = bestPath.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
  if (startIdx > endIdx) slice = slice.reverse();

  slice[0] = start;
  slice[slice.length - 1] = end;

  return slice;
};

// Major US ports and hubs with coordinates
const locations = {
  'Houston, TX': [29.7604, -95.3698],
  'New Orleans, LA': [29.9511, -90.0715],
  'Mobile, AL': [30.6944, -88.0431],
  'Tampa Bay, FL': [27.9506, -82.4572],
  'Savannah, GA': [32.0835, -81.0998],
  'Jacksonville, FL': [30.3322, -81.6557],
  'Miami, FL': [25.7617, -80.1918],
  'New York/NJ': [40.7128, -74.0060],
  'Philadelphia, PA': [39.9526, -75.1652],
  'Norfolk, VA': [36.8468, -76.2852],
  'Boston, MA': [42.3601, -71.0589],
  'Long Beach, CA': [33.7701, -118.1937],
  'Los Angeles, CA': [34.0522, -118.2437],
  'Seattle, WA': [47.6062, -122.3321],
  'Portland, OR': [45.5152, -122.6784],
  'San Francisco/Oakland, CA': [37.7749, -122.4194],
  'Chicago, IL': [41.8781, -87.6298],
  'St. Louis, MO': [38.6270, -90.1994],
  'Memphis, TN': [35.1495, -90.0490],
  'Duluth-Superior, MN/WI': [46.7867, -92.1005]
};

const RouteMap = ({ 
  routeOptions = [], 
  selectedRoute = null, 
  origin = '', 
  destination = '', 
  onRouteSelect,
  showAllRoutes = false,
  height = '500px'
}) => {
  const [routeData, setRouteData] = useState([]);
  const [mapCenter, setMapCenter] = useState([39.8283, -98.5795]); // Center of US
  const [mapZoom, setMapZoom] = useState(4);

  // Debug logging - moved inside component
  useEffect(() => {
    console.log('RouteMap props:', {
      routeOptions,
      selectedRoute,
      origin,
      destination
    });
  }, [routeOptions, selectedRoute, origin, destination]);

  // Add realistic route paths for different transport modes
  const getRealisticRoutePath = (origin, destination, transportMode) => {
    const originCoords = locations[origin];
    const destCoords = locations[destination];
    
    if (!originCoords || !destCoords) return [originCoords, destCoords].filter(Boolean);
    
    // Define intermediate waypoints for major routes
    const routeWaypoints = {
      'Los Angeles, CA-Seattle, WA': {
        truck: [[34.0522, -118.2437], [36.7783, -119.4179], [37.7749, -122.4194], [45.5152, -122.6784], [47.6062, -122.3321]], // Via Central Valley, SF, Portland
        rail: [[34.0522, -118.2437], [35.3733, -119.0187], [37.7749, -122.4194], [45.5152, -122.6784], [47.6062, -122.3321]] // Rail network route
      },
      'Houston, TX-New Orleans, LA': {
        truck: [[29.7604, -95.3698], [30.2241, -93.2044], [29.9511, -90.0715]], // Via I-10
        rail: [[29.7604, -95.3698], [30.1588, -94.1213], [29.9511, -90.0715]] // Rail corridor
      }
      // Add more routes as needed
    };
  
  const routeKey = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  
  if (routeWaypoints[routeKey] && routeWaypoints[routeKey][transportMode]) {
    return routeWaypoints[routeKey][transportMode];
  } else if (routeWaypoints[reverseKey] && routeWaypoints[reverseKey][transportMode]) {
    return [...routeWaypoints[reverseKey][transportMode]].reverse();
  }
  
  // Fallback to direct route for unknown combinations
  return [originCoords, destCoords];
};

  // Process route options for map display
  // UPDATE the route processing to use backend waypoints:
useEffect(() => {
  if (routeOptions.length > 0) {
    const processedRoutes = routeOptions.map((route, index) => {
      let routePath = [];

      // Prefer explicit coordinates from the backend
      if (Array.isArray(route.routePath) && route.routePath.length >= 2) {
        if (typeof route.routePath[0] === 'string') {
          routePath = route.routePath
            .map(location => locations[location])
            .filter(coords => coords);
        } else {
          routePath = route.routePath;
        }
      } else if (route.polyline) {
        // Decode any encoded polyline provided
        routePath = decodePolyline(route.polyline);
      } else if (route.waypoints && route.waypoints.length > 0) {
        // Backwards compatibility with old waypoint format
        routePath = route.waypoints;
      }

      // Fallback handling for missing waypoints
      if (routePath.length === 0) {
        const originCoords = locations[route.routePath?.[0] || origin];
        const destCoords = locations[route.routePath?.[route.routePath.length - 1] || destination];

        const primaryMode = route.transportModes?.[0] || 'truck';



        // Final fallback to curved path
        if (routePath.length === 0 && originCoords && destCoords) {
          routePath = generateCurvedPath(originCoords, destCoords, primaryMode);
        }
      }

      return {
        id: route.id || `route-${index}`,
        name: route.name || `Route ${index + 1}`,
        transportModes: route.transportModes || ['truck'],
        routePath,
        distance: route.distance,
        estimatedTime: route.estimatedTime,
        estimatedCost: route.estimatedCost,
        routingMethod: route.routingMethod,
        fallback: route.fallback || false,
        selected: selectedRoute && selectedRoute.id === route.id
      };
    }).filter(route => route !== null && route.routePath.length > 0);

    setRouteData(processedRoutes);
  }
}, [routeOptions, selectedRoute, origin, destination]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="route-map-container">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Map Header */}
        <div className="bg-blue-600 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              🗺️ Interactive Route Visualization
              {routeData.length > 0 && (
                <span className="text-blue-200 text-sm">
                  ({routeData.length} route{routeData.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>
            
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
              {Object.entries(transportStyles).map(([mode, style]) => (
                <div key={mode} className="flex items-center gap-1">
                  <div 
                    className="w-4 h-1" 
                    style={{ 
                      backgroundColor: style.color,
                      borderStyle: style.dashArray ? 'dashed' : 'solid',
                      borderWidth: '1px'
                    }}
                  ></div>
                  <span className="capitalize">{mode}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div style={{ height, width: '100%' }}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors'
              url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
              opacity={0.7}
            />

            <LayersControl position="topright">
              {/* Route Layers */}
              {routeData.map((route) => (
                <LayersControl.Overlay 
                  key={route.id} 
                  name={route.name}
                  checked={showAllRoutes || route.selected}
                >
                  <FeatureGroup>
                    {/* Route line */}
                    {route.routePath.length >= 2 && route.transportModes.map((mode, modeIndex) => {
                      const style = transportStyles[mode] || transportStyles.truck;
                      
                      return (
                        <Polyline
                          key={`${route.id}-${mode}-${modeIndex}`}
                          positions={route.routePath}
                          pathOptions={{
                            color: style.color,
                            weight: style.weight,
                            opacity: route.selected ? 1.0 : style.opacity,
                            dashArray: style.dashArray
                          }}
                          eventHandlers={{
                            click: () => {
                              if (onRouteSelect) {
                                onRouteSelect(route);
                              }
                            }
                          }}
                        >
                          <Popup>
                            <div className="min-w-64">
                              <h4 className="font-semibold text-blue-600 mb-2">{route.name}</h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>Distance:</strong> {route.distance} miles</div>
                                <div><strong>Time:</strong> {route.estimatedTime}</div>
                                <div><strong>Cost:</strong> {formatCurrency(route.estimatedCost)}</div>
                                {route.routingMethod && (
                                  <div><strong>Method:</strong> {route.routingMethod.replace(/_/g, ' ')}</div>
                                )}
                                {route.fallback && (
                                  <div className="text-yellow-600"><strong>⚠️ Estimated route</strong></div>
                                )}
                              </div>
                            </div>
                          </Popup>
                        </Polyline>
                      );
                    })}

                    {/* Route waypoint markers */}
                    {route.routePath.map((coords, index) => {
                      const isOrigin = index === 0;
                      const isDestination = index === route.routePath.length - 1;
                      const isWaypoint = !isOrigin && !isDestination;

                      let markerColor = '#6b7280'; // Default gray
                      let markerSymbol = '📍';
                      let markerSize = 30;

                      if (isOrigin) {
                        markerColor = '#10b981'; // Green
                        markerSymbol = '📍';
                      } else if (isDestination) {
                        markerColor = '#ef4444'; // Red
                        markerSymbol = '📍';
                      } else if (isWaypoint) {
                        markerColor = '#f59e0b'; // Yellow
                        markerSymbol = '🟡';
                        markerSize = 15;
                      }

                      return (
                        <Marker
                          key={`${route.id}-marker-${index}`}
                          position={coords}
                          icon={createCustomIcon(markerColor, markerSymbol, markerSize)}
                        >
                          <Popup>
                            <div className="text-sm">
                              <div className="font-semibold">
                                {isOrigin ? 'Origin' : isDestination ? 'Destination' : 'Waypoint'}
                              </div>
                              <div>Coordinates: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}</div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </FeatureGroup>
                </LayersControl.Overlay>
              ))}

              {/* All Locations Layer */}
              <LayersControl.Overlay name="All Ports & Hubs" checked={false}>
                <FeatureGroup>
                  {Object.entries(locations).map(([name, coords]) => (
                    <Marker
                      key={name}
                      position={coords}
                      icon={createCustomIcon('#6366f1', '🏭')}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold">{name}</div>
                          <div>Coordinates: {coords[0].toFixed(4)}, {coords[1].toFixed(4)}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Available for truck and rail transport
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </FeatureGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>
        </div>

        {/* Route Summary */}
        {routeData.length > 0 && (
          <div className="bg-gray-50 px-4 py-3 border-t">
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Route Summary:</strong> {origin} → {destination}
                </div>
                <div className="flex items-center gap-4">
                  {selectedRoute ? (
                    <div className="text-blue-600">
                      <strong>Selected:</strong> {selectedRoute.name}
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      Click on a route to select it
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteMap;