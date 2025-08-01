// backend/services/openaiService.js - FIXED VERSION
const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not set in environment variables');
    }
    
    this.client = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    
    this.model = process.env.AI_MODEL || 'gpt-4';
    this.isAvailable = true;
    
    // Cache for prices to avoid excessive API calls
    this.priceCache = new Map();
    const defaultTimeout = 15 * 60 * 1000; // 15 minutes
    const envTimeout = parseInt(process.env.OPENAI_PRICE_CACHE_MS, 10);
    this.cacheTimeout = Number.isFinite(envTimeout) ? envTimeout : defaultTimeout;
    
    console.log('🤖 OpenAI Service initialized with model:', this.model);
    
    // Test the connection immediately
    this.testConnection();
  }

  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test connection. Respond with just "OK"' }],
        max_tokens: 5,
        temperature: 0
      });
      
      console.log('✅ OpenAI connection test successful:', response.choices[0].message.content);
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error.message);
      this.isAvailable = false;
    }
  }

  // Get cached or fresh price
  async getCachedPrice(key, fetchFunction) {
    const cached = this.cacheTimeout > 0 ? this.priceCache.get(key) : null;
    if (this.cacheTimeout > 0 && cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log(`📋 Using cached price for ${key}`);
      return cached.data;
    }

    try {
      const data = await fetchFunction();
      if (this.cacheTimeout > 0) {
        this.priceCache.set(key, { data, timestamp: Date.now() });
      }
      return data;
    } catch (error) {
      console.error(`Failed to fetch fresh data for ${key}:`, error);
      if (cached) {
        console.log(`🔄 Using stale cached data for ${key}`);
        return cached.data;
      }
      throw error;
    }
  }

  // ✅ FIXED: Realistic fuel pricing with better error handling
  async getPriceEstimate(fuelType) {
    return this.getCachedPrice(`price_${fuelType}`, async () => {
      try {
        if (!this.isAvailable) {
          throw new Error('OpenAI service is not available');
        }
        console.log('🤖 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
        console.log('🤖 Service available:', this.isAvailable);

        console.log(`🔍 Fetching current market price for ${fuelType} from OpenAI...`);
        
        const today = new Date().toISOString().split('T')[0];
        const prompt = `You are a commodity pricing expert. Provide the current US wholesale market price for ${fuelType} in USD per metric ton as of ${today}.

Use these UPDATED realistic price ranges based on current market conditions:
- Hydrogen: $3,000-4,500 per metric ton (industrial grade, current market ~$3,865/MT)
- Methanol: $650-850 per metric ton (wholesale, current market ~$750-800/MT)
- Ammonia: $450-600 per metric ton (industrial grade, current market ~$510/MT)

Consider current market volatility, supply chain factors, and energy costs. Provide a realistic price that reflects actual 2024-2025 market conditions.

Respond with ONLY a JSON object in this exact format with NO additional text:
{
  "price": 750,
  "unit": "USD_per_metric_ton",
  "source": "current_market_analysis",
  "date": "${today}",
  "confidence": "high"
}`;

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a commodity pricing expert. Always respond with realistic wholesale market prices in valid JSON only, no additional text.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.1
        });

        let result;
        try {
          const content = response.choices[0].message.content.trim();
          console.log('Raw OpenAI response:', content);
          
          // Try to extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(content);
          }
        } catch (parseError) {
          console.error('❌ Failed to parse OpenAI response:', parseError);
          throw new Error('Invalid JSON response from OpenAI');
        }
        console.log('🤖 RAW OpenAI RESPONSE:', response.choices[0].message.content);
        console.log('🤖 PARSED RESULT:', result);

        console.log(`✅ OpenAI realistic price response for ${fuelType}:`, result);

        // Validate and return the price directly
        let finalPrice = result.price;
        if (typeof finalPrice !== 'number' || isNaN(finalPrice)) {
          throw new Error('Invalid price returned from OpenAI');
        }
        
        return {
          price: finalPrice,
          unit: 'USD_per_ton',
          confidence: result.confidence || 'medium',
          source: result.source || 'openai_realistic_market',
          date: result.date || today,
          aiUsed: true
        };
        
      } catch (error) {
        console.error('❌ OpenAI price fetch error:', error.message);
        // Don't disable service for single failures - retry on next request
        throw error;
      }
    });
  }

  // ✅ FIXED: Transport cost factors with better error handling
  async getTransportCostFactors(transportMode, fuelType, distance) {
    const cacheKey = `transport_${transportMode}_${fuelType}_${Math.floor(distance/100)}`;
    
    return this.getCachedPrice(cacheKey, async () => {
      try {
        if (!this.isAvailable) {
          throw new Error('OpenAI service is not available');
        }

        console.log(`🔍 Fetching transport cost factors for ${transportMode} carrying ${fuelType} over ${distance} miles`);

        const today = new Date().toISOString().split('T')[0];
        const prompt = `You are a transportation cost expert. Provide current market factors for transporting ${fuelType} via ${transportMode} over ${distance} miles in the US as of ${today}.

Consider:
- Current fuel prices (diesel ~$3.50/gallon)
- Distance: ${distance} miles
- Special handling for ${fuelType}
- Market demand and capacity
- Seasonal factors

Respond with ONLY a JSON object in this exact format with NO additional text:
{
  "base_rate_per_mile": 2.75,
  "fuel_surcharge": 0.18,
  "special_handling_multiplier": 1.3,
  "distance_efficiency": 0.95,
  "market_conditions": "normal"
}`;

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a transportation pricing expert. Always respond with valid JSON only containing realistic market rates.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 300,
          temperature: 0.2
        });

        let result;
        try {
          const content = response.choices[0].message.content.trim();
          console.log('Raw OpenAI transport response:', content);
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            result = JSON.parse(content);
          }
        } catch (parseError) {
          console.error('❌ Failed to parse OpenAI transport response:', parseError);
          throw new Error('Invalid JSON response from OpenAI');
        }

        console.log(`✅ OpenAI transport factors for ${transportMode} + ${fuelType}:`, result);
        
        // Validate all required fields are numbers
        const requiredFields = ['base_rate_per_mile', 'fuel_surcharge', 'special_handling_multiplier', 'distance_efficiency'];
        for (const field of requiredFields) {
          if (typeof result[field] !== 'number' || isNaN(result[field])) {
            throw new Error(`Invalid ${field} returned from OpenAI`);
          }
        }
        
        result.aiUsed = true;
        return result;
        
      } catch (error) {
        console.error('❌ OpenAI transport factors error:', error.message);
        // Don't disable service for single failures - retry on next request
        throw error;
      }
    });
  }

  // ✅ FIXED: Distance calculation with better error handling
  async calculateDistanceWithModeAdjustment(origin, destination, transportMode) {
    try {
      if (!this.isAvailable) {
        throw new Error('OpenAI service is not available');
      }

      console.log(`🔍 Calculating ${transportMode} distance from ${origin} to ${destination}`);
      
      const prompt = `Calculate the realistic transportation distance for ${transportMode} between "${origin}" and "${destination}".

Consider actual transportation routes (not straight-line distance) and infrastructure requirements.

Transport mode routing:
- Truck: Highway system, direct routes
- Rail: Rail network routing, may be longer than highways
- Ship: Coastal/maritime routes, port-to-port
- Pipeline: Direct underground routes

Respond with ONLY a JSON object with NO additional text:
{
  "distance_miles": 1250,
  "route_type": "highway",
  "routing_notes": "I-10 corridor via Houston"
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a transportation routing expert. Provide realistic distances based on actual transportation infrastructure in JSON format only.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0
      });

      let result;
      try {
        const content = response.choices[0].message.content.trim();
        console.log('Raw OpenAI distance response:', content);
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI distance response:', parseError);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate distance is a number
      if (typeof result.distance_miles !== 'number' || isNaN(result.distance_miles)) {
        throw new Error('Invalid distance returned from OpenAI');
      }

      console.log(`✅ Distance calculation result:`, result);
      result.aiUsed = true;
      return result;
      
    } catch (error) {
      console.error('❌ Distance calculation error:', error.message);
      // Don't disable service for single failures - retry on next request
      throw error;
    }
  }

  // ✅ Enhanced location analysis with transport suitability
  async getLocationCoordinatesWithTransport(location, transportMode, fuelType) {
    try {
      if (!this.isAvailable) {
        throw new Error('OpenAI service is not available');
      }

      console.log(`🔍 Analyzing location ${location} for ${transportMode} transport of ${fuelType}...`);
      
      const prompt = `Analyze the location "${location}" for ${transportMode} transportation of ${fuelType}. Provide coordinates and transport suitability assessment.

Consider:
- Geographic coordinates
- Transportation infrastructure (highways, rail, ports)
- Fuel handling capabilities for ${fuelType}
- Safety and regulatory compliance

Respond with ONLY a JSON object with NO additional text:
{
  "lat": 29.7604,
  "lon": -95.3698,
  "full_name": "Houston, Texas, USA",
  "type": "port",
  "country": "USA",
  "transport_suitable": true,
  "infrastructure_score": 95,
  "fuel_handling_score": 90
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a transportation and logistics expert. Always respond with valid JSON only containing accurate location and transport analysis.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.1
      });

      let result;
      try {
        const content = response.choices[0].message.content.trim();
        console.log('Raw OpenAI location transport response:', content);
        
        // Remove markdown code blocks if present
        let cleanContent = content;
        if (content.includes('```json')) {
          cleanContent = content.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (content.includes('```')) {
          cleanContent = content.replace(/```\s*/, '').replace(/```\s*$/, '');
        }
        
        // Extract JSON object
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(cleanContent);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI location transport response:', parseError);
        console.error('❌ Raw content was:', response.choices[0].message.content);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate coordinates and scores
      if (typeof result.lat !== 'number' || typeof result.lon !== 'number' || 
          isNaN(result.lat) || isNaN(result.lon)) {
        throw new Error('Invalid coordinates returned from OpenAI');
      }

      console.log(`✅ OpenAI location transport analysis for ${location}:`, result);
      result.aiUsed = true;
      return result;
      
    } catch (error) {
      console.error('❌ OpenAI location transport analysis error:', error.message);
      // Don't disable service for single failures - retry on next request
      throw error;
    }
  }

  // ✅ Basic location coordinates (simplified)
  async getLocationCoordinates(location) {
    try {
      if (!this.isAvailable) {
        throw new Error('OpenAI service is not available');
      }

      console.log(`🔍 Fetching coordinates for ${location} from OpenAI...`);
      
      const prompt = `Provide the latitude and longitude coordinates for "${location}". This should be a major port, city, or logistics hub.

Respond with ONLY a JSON object with NO additional text:
{
  "lat": 45.5152,
  "lon": -122.6784,
  "full_name": "Portland, Oregon, USA",
  "type": "port",
  "country": "USA"
}`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a geography expert. Always respond with valid JSON only containing accurate coordinates.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0
      });

      let result;
      try {
        const content = response.choices[0].message.content.trim();
        console.log('Raw OpenAI location response:', content);
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI location response:', parseError);
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Validate coordinates
      if (typeof result.lat !== 'number' || typeof result.lon !== 'number' || 
          isNaN(result.lat) || isNaN(result.lon)) {
        throw new Error('Invalid coordinates returned from OpenAI');
      }

      console.log(`✅ OpenAI location response for ${location}:`, result);
      result.aiUsed = true;
      return result;
      
    } catch (error) {
      console.error('❌ OpenAI location fetch error:', error.message);
      this.isAvailable = false;
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'user', content: 'Respond with exactly: {"status": "ok"}' }
        ],
        max_tokens: 20,
        temperature: 0
      });

      const content = response.choices[0].message.content.trim();
      const result = JSON.parse(content);
      this.isAvailable = result.status === 'ok';
      return this.isAvailable;
    } catch (error) {
      console.error('❌ OpenAI health check failed:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  // Fallback for location coordinates
  getKnownLocationFallback(location) {
    const knownLocations = {
      'houston': { lat: 29.7604, lon: -95.3698, full_name: "Houston TX USA", type: "port", country: "USA" },
      'los angeles': { lat: 34.0522, lon: -118.2437, full_name: "Los Angeles CA USA", type: "port", country: "USA" },
      'san francisco': { lat: 37.7749, lon: -122.4194, full_name: "San Francisco CA USA", type: "port", country: "USA" },
      'seattle': { lat: 47.6062, lon: -122.3321, full_name: "Seattle WA USA", type: "port", country: "USA" },
      'new york': { lat: 40.7128, lon: -74.0060, full_name: "New York NY USA", type: "port", country: "USA" },
      'portland': { lat: 45.5152, lon: -122.6784, full_name: "Portland OR USA", type: "port", country: "USA" },
      'long beach': { lat: 33.7701, lon: -118.1937, full_name: "Long Beach CA USA", type: "port", country: "USA" },
      'chicago': { lat: 41.8781, lon: -87.6298, full_name: "Chicago IL USA", type: "hub", country: "USA" },
      'miami': { lat: 25.7617, lon: -80.1918, full_name: "Miami FL USA", type: "port", country: "USA" },
      'new orleans': { lat: 29.9511, lon: -90.0715, full_name: "New Orleans LA USA", type: "port", country: "USA" },
      'philadelphia': { lat: 39.9526, lon: -75.1652, full_name: "Philadelphia PA USA", type: "port", country: "USA" },
      'norfolk': { lat: 36.8508, lon: -76.2859, full_name: "Norfolk VA USA", type: "port", country: "USA" },
      'boston': { lat: 42.3601, lon: -71.0589, full_name: "Boston MA USA", type: "port", country: "USA" },
      'savannah': { lat: 32.0835, lon: -81.0998, full_name: "Savannah GA USA", type: "port", country: "USA" },
      'jacksonville': { lat: 30.3322, lon: -81.6557, full_name: "Jacksonville FL USA", type: "port", country: "USA" },
      'tampa': { lat: 27.9506, lon: -82.4572, full_name: "Tampa FL USA", type: "port", country: "USA" },
      'mobile': { lat: 30.6944, lon: -88.0431, full_name: "Mobile AL USA", type: "port", country: "USA" },
      'st louis': { lat: 38.6270, lon: -90.1994, full_name: "St Louis MO USA", type: "hub", country: "USA" },
      'memphis': { lat: 35.1495, lon: -90.0490, full_name: "Memphis TN USA", type: "hub", country: "USA" },
      'duluth': { lat: 46.7867, lon: -92.1005, full_name: "Duluth MN USA", type: "port", country: "USA" }
    };
    
    const locationLower = location.toLowerCase();
    
    for (const [key, coords] of Object.entries(knownLocations)) {
      if (locationLower.includes(key) || key.includes(locationLower.split(',')[0].trim())) {
        console.log(`✅ Using known coordinates for ${location}: [${coords.lat}, ${coords.lon}]`);
        return { ...coords, aiUsed: false };
      }
    }
    
    console.log(`⚠️ No known coordinates for ${location}, using Houston fallback`);
    return {
      lat: 29.7604,
      lon: -95.3698,
      full_name: location,
      type: "city",
      country: "USA",
      aiUsed: false
    };
  }
}

// Export singleton instance
let instance = null;

try {
  instance = new OpenAIService();
} catch (error) {
  console.error('⚠️ Could not initialize OpenAI service:', error.message);
}

module.exports = instance;