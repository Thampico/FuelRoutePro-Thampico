const axios = require('axios');
const polyline = require('@mapbox/polyline');

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';

    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API key not found. Distance calculations will use fallback methods.');
      this.isAvailable = false;
    } else {
      this.isAvailable = true;
      console.log('🗺️ Google Maps service initialized');
    }
  }

  // 🚛 Get driving distance and route for trucks
  async getTruckRoute(origin, destination) {
    if (!this.isAvailable) {
      throw new Error('Google Maps API not available');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: origin,
          destination: destination,
          mode: 'driving',
          units: 'imperial',      // miles
          key: this.apiKey,
          avoid: 'tolls',         // optimize for cost
          alternatives: true      // include alternative routes
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const routes = response.data.routes.map(route => ({
        distance_miles: Math.round(
          route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) * 0.000621371  // meters → miles
        ),
        duration_hours: Math.round(
          route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 3600 * 10
        ) / 10,  // seconds → hours with 1 decimal
        route_summary: route.summary,
        route_polyline: route.overview_polyline?.points || null,
        waypoints: route.legs.map(leg => ({
          start: leg.start_address,
          end: leg.end_address,
          distance_miles: Math.round(leg.distance.value * 0.000621371),
          duration_hours: Math.round(leg.duration.value / 3600 * 10) / 10
        }))
      }));

      if (routes.length === 0) {
        throw new Error('No routes returned from Google Maps');
      }

      const mainRoute = routes[0];

      // Decode polyline into [lat, lng] coordinate pairs if available
      const routePath = mainRoute.route_polyline
        ? polyline.decode(mainRoute.route_polyline).map(([lat, lng]) => [lat, lng])
        : [];

      console.log(`🚛 Truck route: ${origin} → ${destination}: ${mainRoute.distance_miles} mi, ${mainRoute.duration_hours} h`);

      return {
        distance_miles: mainRoute.distance_miles,
        duration_hours: mainRoute.duration_hours,
        route_summary: mainRoute.route_summary,
        route_type: 'truck_highway',
        routing_method: 'google_maps_directions',
        polyline: mainRoute.route_polyline,
        route_path: routePath,
        alternative_routes: routes.slice(1, 3) // Include up to 2 alternate options
      };

    } catch (error) {
      console.error('Google Maps truck routing error:', error.message);
      throw new Error(`Failed to get truck route: ${error.message}`);
    }
  }

  // 📍 Geocode a location string to coordinates
  async geocodeLocation(location) {
    if (!this.isAvailable) {
      throw new Error('Google Maps API not available');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: location,
          key: this.apiKey,
          region: 'us'
        }
      });

      if (response.data.status !== 'OK' || !response.data.results.length) {
        throw new Error(`Location not found: ${location}`);
      }

      const result = response.data.results[0];

      return {
        formatted_address: result.formatted_address,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        place_id: result.place_id,
        address_components: result.address_components,
        types: result.types
      };

    } catch (error) {
      console.error('Google Maps geocoding error:', error.message);
      throw new Error(`Failed to geocode location: ${error.message}`);
    }
  }

  // ✅ Service health check
  async healthCheck() {
    if (!this.isAvailable) return false;

    try {
      await this.geocodeLocation('New York, NY');
      return true;
    } catch (error) {
      console.error('Google Maps health check failed:', error.message);
      this.isAvailable = false;
      return false;
    }
  }
}

module.exports = new GoogleMapsService();