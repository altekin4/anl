import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import config from '@/config';
import logger from '@/utils/logger';
import routes from '@/routes';
import healthRoutes from '@/routes/healthRoutes';
import { WebSocketService } from '@/services/WebSocketService';
import performanceMonitor from '@/services/PerformanceMonitoringService';
import { CacheService } from '@/services/CacheService';
import db from '@/database/connection';
import mockDb from '@/database/mockConnection';
import { 
  errorHandler, 
  notFoundHandler, 
  handleUnhandledRejection, 
  handleUncaughtException 
} from '@/middleware/errorHandler';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Performance monitoring middleware (should be first)
app.use(performanceMonitor.requestMonitoringMiddleware());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Mount health check routes
app.use('/health', healthRoutes);

// Mount API routes
app.use('/', routes);

// Initialize WebSocket service
// WebSocket service disabled for now
// const webSocketService = new WebSocketService(io, db);
// webSocketService.initialize();

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

// Setup global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Initialize services
async function initializeServices() {
  try {
    // Try to initialize cache service (optional)
    try {
      const cacheService = new CacheService();
      await cacheService.connect();
      logger.info('Cache service connected');
    } catch (error) {
      logger.warn('Cache service not available, continuing without cache:', (error as Error).message);
    }
    
    // Try to run database migrations (use mock if real DB not available)
    try {
      await db.runMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.warn('Database not available, using mock database:', (error as Error).message);
      await mockDb.runMigrations();
    }
    
    // Start performance monitoring
    setInterval(() => {
      performanceMonitor.logPerformanceSummary();
    }, 300000); // Log performance summary every 5 minutes
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    // Don't exit in development, continue with limited functionality
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
}

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  try {
    await db.close();
  } catch (error) {
    logger.warn('Error closing database connection:', (error as Error).message);
  }
  
  // Close cache connections
  try {
    const cacheService = new CacheService();
    await cacheService.disconnect();
  } catch (error) {
    logger.warn('Error closing cache connection:', (error as Error).message);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close database connections
  try {
    await db.close();
  } catch (error) {
    logger.warn('Error closing database connection:', (error as Error).message);
  }
  
  // Close cache connections
  try {
    const cacheService = new CacheService();
    await cacheService.disconnect();
  } catch (error) {
    logger.warn('Error closing cache connection:', (error as Error).message);
  }
  
  process.exit(0);
});

export { app, io };