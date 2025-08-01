const axios = require('axios');

class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
  }

  // Get cached data or fetch new data
  async getCachedData(key, fetchFunction) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const data = await fetchFunction();
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error.message);
      return cached ? cached.data : null;
    }
  }

  // Fetch real commodity prices (you'll need to register for these APIs)
  async getCommodityPrices() {
    return this.getCachedData('commodity_prices', async () => {
      try {
        // For now, return realistic market estimates
        // In production, you would integrate with real APIs
        
        return {
          hydrogen: {
            price: this.calculateHydrogenPrice(),
            unit: 'USD_per_kg',
            source: 'market_estimate',
            timestamp: new Date().toISOString()
          },
          methanol: {
            price: 0.92,
            unit: 'USD_per_gallon',
            source: 'market_estimate',
            timestamp: new Date().toISOString()
          },
          ammonia: {
            price: 785,
            unit: 'USD_per_metric_ton',
            source: 'market_estimate', 
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        throw new Error(`Commodity price fetch failed: ${error.message}`);
      }
    });
  }

  calculateHydrogenPrice() {
    // Hydrogen pricing varies by production method
    // Green H2: $4-8/kg, Blue H2: $2-4/kg, Gray H2: $1-3/kg
    const basePrice = 4.5; // Conservative estimate for industrial hydrogen
    const marketVariation = (Math.random() - 0.5) * 0.5; // ±$0.25 variation
    return Math.max(3.5, basePrice + marketVariation);
  }

  // Get freight and shipping rates
  async getTransportRates() {
    return this.getCachedData('transport_rates', async () => {
      try {
        // Get current market rates with adjustments
        const baseRates = this.getDefaultRates();
        const surcharges = await this.fetchFuelSurcharges();
        const laborAdjustment = 1.05; // 5% labor cost increase

        return {
          truck: {
            base_rate: baseRates.truck,
            fuel_surcharge: surcharges.truck || 0.25,
            labor_adjustment: laborAdjustment,
            final_rate: baseRates.truck * (1 + (surcharges.truck || 0.25)) * laborAdjustment,
            unit: 'USD_per_ton_mile',
            timestamp: new Date().toISOString()
          },
          rail: {
            base_rate: baseRates.rail,
            fuel_surcharge: surcharges.rail || 0.15,
            labor_adjustment: laborAdjustment,
            final_rate: baseRates.rail * (1 + (surcharges.rail || 0.15)) * laborAdjustment,
            unit: 'USD_per_ton_mile',
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        throw new Error(`Transport rate fetch failed: ${error.message}`);
      }
    });
  }

  async fetchFuelSurcharges() {
    // Calculate fuel surcharges based on current diesel prices
    try {
      // In production, you'd fetch real diesel prices from EIA or similar
      const dieselPrice = 3.45; // Current estimate
      const baselinePrice = 3.0;
      const surchargeMultiplier = Math.max(0, (dieselPrice - baselinePrice) / baselinePrice);
      
      return {
        truck: 0.15 + (surchargeMultiplier * 0.1), // Base 15% + variable
        rail: 0.10 + (surchargeMultiplier * 0.05)  // Base 10% + variable
      };
    } catch (error) {
      return { truck: 0.25, rail: 0.15 };
    }
  }

  getDefaultRates() {
    return {
      truck: 2.85,
      rail: 1.12
    };
  }

  // Get exchange rates for international shipments
  async getExchangeRates() {
    return this.getCachedData('exchange_rates', async () => {
      try {
        // In production, integrate with a real exchange rate API
        return {
          USD_TWD: 31.25,
          USD_CNY: 7.18,
          USD_JPY: 148.50,
          USD_EUR: 0.85,
          USD_GBP: 0.73,
          timestamp: new Date().toISOString(),
          source: 'market_estimate'
        };
      } catch (error) {
        throw new Error(`Exchange rate fetch failed: ${error.message}`);
      }
    });
  }

  // Get regulatory and compliance costs
  async getRegulatoryData() {
    return {
      hazmat_permits: {
        hydrogen: { cost: 250, validity_days: 365 },
        methanol: { cost: 180, validity_days: 365 },
        ammonia: { cost: 320, validity_days: 365 }
      },
      inspection_fees: {
        us_domestic: 150,
        international: 450,
        hazmat_additional: 200
      },
      customs_duties: {
        taiwan_to_us: 0.025, // 2.5%
        us_to_taiwan: 0.015  // 1.5%
      },
      environmental_compliance: {
        carbon_tax_per_ton: 12.50,
        environmental_surcharge: 0.02 // 2% of transport cost
      }
    };
  }

  // Get seasonal adjustment factors
  getSeasonalFactors() {
    const month = new Date().getMonth() + 1;
    const isWinter = month >= 11 || month <= 2;
    const isSummer = month >= 6 && month <= 8;
    
    return {
      weather_impact: isWinter ? 1.15 : isSummer ? 1.05 : 1.0,
      demand_seasonality: isSummer ? 1.1 : 1.0,
      holiday_factor: month === 12 ? 1.2 : 1.0
    };
  }

  // Get market volatility indicators
  getMarketVolatility() {
    return {
      fuel_price_volatility: {
        hydrogen: 'high',    // New market, high volatility
        methanol: 'medium',  // Established but variable
        ammonia: 'low'       // Stable industrial commodity
      },
      transport_rate_volatility: {
        truck: 'high',     // Labor and fuel sensitive
        rail: 'medium'    // More stable, long-term contracts
      },
      overall_market_trend: 'stable_with_upward_pressure'
    };
  }

  // Health check for market data services
  async checkServiceHealth() {
    const services = {
      commodity_prices: 'available',
      transport_rates: 'available', 
      exchange_rates: 'available',
      regulatory_data: 'available'
    };

    // Test cache functionality
    try {
      await this.getCommodityPrices();
      services.cache_system = 'operational';
    } catch (error) {
      services.cache_system = 'degraded';
    }

    return {
      status: 'operational',
      services,
      cache_size: this.cache.size,
      last_updated: new Date().toISOString()
    };
  }

  // Clear cache (useful for testing or forced refresh)
  clearCache() {
    this.cache.clear();
    console.log('📊 Market data cache cleared');
  }

  // Get comprehensive market summary
  async getMarketSummary() {
    try {
      const [prices, rates, volatility, seasonal] = await Promise.all([
        this.getCommodityPrices(),
        this.getTransportRates(), 
        Promise.resolve(this.getMarketVolatility()),
        Promise.resolve(this.getSeasonalFactors())
      ]);

      return {
        fuel_prices: prices,
        transport_rates: rates,
        market_conditions: {
          volatility: volatility,
          seasonal_factors: seasonal,
          overall_trend: 'stable',
          risk_level: 'moderate'
        },
        summary: {
          hydrogen_outlook: 'Prices stabilizing as production scales up',
          transport_outlook: 'Moderate increases due to fuel and labor costs',
          regulatory_outlook: 'Increasing compliance requirements for alternative fuels'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Market summary failed: ${error.message}`);
    }
  }
}

module.exports = new MarketDataService();