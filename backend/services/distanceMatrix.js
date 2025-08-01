// backend/services/distanceMatrix.js - Real-world distances between 20 US ports/hubs

const DISTANCE_MATRIX = {
    // Format: 'Origin-Destination': { truck: miles, rail: miles}
    
    // Houston, TX connections
    'Houston, TX-New Orleans, LA': { truck: 350, rail: 350},
    'Houston, TX-Mobile, AL': { truck: 335, rail: 367},
    'Houston, TX-Tampa Bay, FL': { truck: 875, rail: 920},
    'Houston, TX-Savannah, GA': { truck: 870, rail: 915},
    'Houston, TX-Jacksonville, FL': { truck: 825, rail: 890},
    'Houston, TX-Miami, FL': { truck: 1190, rail: 1250},
    'Houston, TX-New York/NJ': { truck: 1630, rail: 1720},
    'Houston, TX-Philadelphia, PA': { truck: 1555, rail: 1640},
    'Houston, TX-Norfolk, VA': { truck: 1420, rail: 1510},
    'Houston, TX-Boston, MA': { truck: 1770, rail: 1860},
    'Houston, TX-Long Beach, CA': { truck: 1545, rail: 1720},
    'Houston, TX-Los Angeles, CA': { truck: 1555, rail: 1546},
    'Houston, TX-Seattle, WA': { truck: 2350, rail: 2480},
    'Houston, TX-Portland, OR': { truck: 2180, rail: 2300},
    'Houston, TX-San Francisco/Oakland, CA': { truck: 1920, rail: 2050},
    'Houston, TX-Chicago, IL': { truck: 1080, rail: 1092},
    'Houston, TX-St. Louis, MO': { truck: 780, rail: 679},
    'Houston, TX-Memphis, TN': { truck: 570, rail: 520},
    'Houston, TX-Duluth-Superior, MN/WI': { truck: 1350, rail: 1200},
  
    // Los Angeles, CA connections  
    'Los Angeles, CA-Long Beach, CA': { truck: 25, rail: 25},
    'Los Angeles, CA-San Francisco/Oakland, CA': { truck: 380, rail: 382},
    'Los Angeles, CA-Seattle, WA': { truck: 1135, rail: 1377},
    'Los Angeles, CA-Portland, OR': { truck: 965, rail: 963},
    'Los Angeles, CA-Houston, TX': { truck: 1555, rail: 1546},
    'Los Angeles, CA-New Orleans, LA': { truck: 1890, rail: 2090},
    'Los Angeles, CA-Chicago, IL': { truck: 2015, rail: 2256},
    'Los Angeles, CA-New York/NJ': { truck: 2790, rail: 2800},
    'Los Angeles, CA-Miami, FL': { truck: 2750, rail: 2900},
    'Los Angeles, CA-Boston, MA': { truck: 3000, rail: 3100},
  
    // Seattle, WA connections
    'Seattle, WA-Portland, OR': { truck: 170, rail: 186},
    'Seattle, WA-San Francisco/Oakland, CA': { truck: 810, rail: 926},
    'Seattle, WA-Long Beach, CA': { truck: 1160, rail: 1380},
    'Seattle, WA-Chicago, IL': { truck: 2065, rail: 2062},
    'Seattle, WA-New York/NJ': { truck: 2860, rail: 2852},
    'Seattle, WA-Houston, TX': { truck: 2350, rail: 2480},
  
    // New York/NJ connections
    'New York/NJ-Philadelphia, PA': { truck: 95, rail: 83},
    'New York/NJ-Boston, MA': { truck: 215, rail: 231},
    'New York/NJ-Norfolk, VA': { truck: 340, rail: 375},
    'New York/NJ-Savannah, GA': { truck: 720, rail: 785},
    'New York/NJ-Jacksonville, FL': { truck: 940, rail: 1020},
    'New York/NJ-Miami, FL': { truck: 1280, rail: 1380},
    'New York/NJ-Chicago, IL': { truck: 790, rail: 790},
  
    // Chicago, IL connections
    'Chicago, IL-St. Louis, MO': { truck: 300, rail: 284},
    'Chicago, IL-Memphis, TN': { truck: 530, rail: 341},
    'Chicago, IL-Duluth-Superior, MN/WI': { truck: 350, rail: 465},
    'Chicago, IL-Detroit, MI': { truck: 280, rail: 285},
  
    // Gulf Coast connections
    'New Orleans, LA-Mobile, AL': { truck: 145, rail: 150},
    'New Orleans, LA-Tampa Bay, FL': { truck: 680, rail: 720},
    'Mobile, AL-Tampa Bay, FL': { truck: 290, rail: 340},
  
    // Southeast connections
    'Savannah, GA-Jacksonville, FL': { truck: 140, rail: 139},
    'Jacksonville, FL-Miami, FL': { truck: 345, rail: 354},
    'Tampa Bay, FL-Miami, FL': { truck: 280, rail: 281},
    'Miami, FL-Norfolk, VA': { truck: 971, rail: 912},
  
    // Northeast connections
    'Philadelphia, PA-Norfolk, VA': { truck: 300, rail: 295},
    'Norfolk, VA-Savannah, GA': { truck: 375, rail: 419},
    'Boston, MA-Philadelphia, PA': { truck: 314, rail: 314},
  
    // Midwest connections
    'St. Louis, MO-Memphis, TN': { truck: 285, rail: 305},
    'Memphis, TN-New Orleans, LA': { truck: 340, rail: 395},
  
    // West Coast connections
    'Portland, OR-San Francisco/Oakland, CA': { truck: 635, rail: 713},
    'San Francisco/Oakland, CA-Long Beach, CA': { truck: 400, rail: 400}
  };
  
  // Helper function to get distance between two locations
  function getDistance(origin, destination, transportMode) {
    const key1 = `${origin}-${destination}`;
    const key2 = `${destination}-${origin}`;
    
    const route = DISTANCE_MATRIX[key1] || DISTANCE_MATRIX[key2];
    
    if (!route) {
      console.warn(`No distance data for ${origin} → ${destination}`);
      return null;
    }
    
    const distance = route[transportMode];
    if (distance === null) {
      console.warn(`${transportMode} not available for ${origin} → ${destination}`);
      return null;
    }
    
    return distance;
  }
  
  // Get all available routes for a location
  function getAvailableRoutes(origin, transportMode) {
    const availableRoutes = [];
    
    Object.keys(DISTANCE_MATRIX).forEach(key => {
      const [routeOrigin, routeDestination] = key.split('-');
      
      if (routeOrigin === origin || routeDestination === origin) {
        const destination = routeOrigin === origin ? routeDestination : routeOrigin;
        const route = DISTANCE_MATRIX[key];
        
        if (route[transportMode] !== null) {
          availableRoutes.push({
            destination,
            distance: route[transportMode],
            transportMode
          });
        }
      }
    });
    
    return availableRoutes;
  }
  
  module.exports = {
    DISTANCE_MATRIX,
    getDistance,
    getAvailableRoutes
  };