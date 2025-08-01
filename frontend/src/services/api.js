// Change this line:
const API_BASE_URL = 'http://localhost:5001/api';  // Changed from 5000 to 5001

class ApiService {
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check endpoint
  async checkHealth() {
    return this.makeRequest('/health');
  }

  // Get supported fuel types
  async getFuelTypes() {
    return this.makeRequest('/fuel-types');
  }

  // Calculate route cost
  async calculateCost(routeData) {
    return this.makeRequest('/calculate-cost', {
      method: 'POST',
      body: JSON.stringify(routeData),
    });
  }

  // Get route history
  async getRouteHistory() {
    return this.makeRequest('/routes');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual functions for easier importing
export const calculateRouteCost = (routeData) => apiService.calculateCost(routeData);
export const getFuelTypes = () => apiService.getFuelTypes();
export const getRouteHistory = () => apiService.getRouteHistory();
export const checkApiHealth = () => apiService.checkHealth();

export default apiService;