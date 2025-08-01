// Enhanced Error Handling and Monitoring
const fs = require('fs').promises;
const path = require('path');

class ErrorHandler {
  constructor() {
    this.errorLogPath = path.join(__dirname, '..', 'logs', 'errors.log');
    this.aiLogPath = path.join(__dirname, '..', 'logs', 'ai-calculations.log');
    this.performanceLogPath = path.join(__dirname, '..', 'logs', 'performance.log');
    
    this.initializeLogs();
  }

  async initializeLogs() {
    const logsDir = path.dirname(this.errorLogPath);
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.error('Could not create logs directory:', error);
    }
  }

  async logError(error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      severity: this.getSeverity(error),
      component: context.component || 'unknown'
    };

    console.error('🚨 Error logged:', logEntry);

    try {
      await fs.appendFile(
        this.errorLogPath, 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }

    // Send alerts for critical errors
    if (logEntry.severity === 'critical') {
      this.sendAlert(logEntry);
    }
  }

  async logAICalculation(request, response, timing) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      request: {
        fuelType: request.fuelType,
        volume: request.volume,
        origin: request.origin,
        destination: request.destination,
        hasIntermediateHub: !!request.intermediateHub
      },
      response: {
        success: response.success,
        totalCost: response.data?.totalCost,
        confidence: response.data?.confidence,
        calculationMethod: response.calculation_method
      },
      timing: {
        totalDuration: timing.totalDuration,
        aiDuration: timing.aiDuration,
        marketDataDuration: timing.marketDataDuration
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    try {
      await fs.appendFile(
        this.aiLogPath, 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (error) {
      console.error('Failed to write AI calculation log:', error);
    }
  }

  async logPerformance(operation, duration, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      metadata,
      memoryUsage: process.memoryUsage()
    };

    try {
      await fs.appendFile(
        this.performanceLogPath, 
        JSON.stringify(logEntry) + '\n'
      );
    } catch (error) {
      console.error('Failed to write performance log:', error);
    }
  }

  getSeverity(error) {
    // Determine error severity based on error type and message
    const criticalKeywords = ['openai', 'database', 'connection', 'timeout'];
    const warningKeywords = ['calculation', 'market', 'api'];

    const message = error.message.toLowerCase();
    
    if (criticalKeywords.some(keyword => message.includes(keyword))) {
      return 'critical';
    } else if (warningKeywords.some(keyword => message.includes(keyword))) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  sendAlert(logEntry) {
    // In a production environment, you would send alerts via:
    // - Email (using nodemailer)
    // - Slack webhook
    // - PagerDuty
    // - SMS service
    
    console.error('🚨 CRITICAL ERROR ALERT:', {
      message: logEntry.error.message,
      component: logEntry.component,
      timestamp: logEntry.timestamp
    });

    // Example: Send to a monitoring service
    // this.sendToMonitoringService(logEntry);
  }

  // Express middleware for global error handling
  expressErrorHandler = (error, req, res, next) => {
    this.logError(error, {
      component: 'express',
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Don't expose internal errors to client
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.status(error.status || 500).json({
      error: isProduction ? 'Internal server error' : error.message,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown'
    });
  }

  // Async error wrapper for route handlers
  asyncWrapper = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        this.logError(error, {
          component: 'route_handler',
          route: req.route?.path,
          method: req.method
        });
        next(error);
      });
    };
  }

  // Monitor AI service health
  async checkAIServiceHealth() {
    try {
      // Simple health check - you could expand this
      const healthCheck = {
        timestamp: new Date().toISOString(),
        openai_api: 'unknown',
        market_data_services: 'unknown',
        database: 'unknown'
      };

      // Test OpenAI API
      try {
        if (process.env.OPENAI_API_KEY) {
          healthCheck.openai_api = 'configured';
        } else {
          healthCheck.openai_api = 'not_configured';
        }
      } catch (error) {
        healthCheck.openai_api = 'error';
      }

      return healthCheck;
    } catch (error) {
      this.logError(error, { component: 'health_check' });
      throw error;
    }
  }
}

const errorHandler = new ErrorHandler();

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    errorHandler.logPerformance(`${req.method} ${req.path}`, duration, {
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length') || 0
    });
  });
  
  next();
};

// Rate limiting for AI endpoints
const createAIRateLimit = () => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 AI requests per windowMs
    message: {
      error: 'Too many AI calculation requests from this IP, please try again later.',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      errorHandler.logError(new Error('Rate limit exceeded'), {
        component: 'rate_limiter',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(options.statusCode).json(options.message);
    }
  });
};

module.exports = {
  errorHandler,
  performanceMonitor,
  createAIRateLimit
};