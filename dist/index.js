"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const config_1 = __importDefault(require("@/config"));
const logger_1 = __importDefault(require("@/utils/logger"));
const routes_1 = __importDefault(require("@/routes"));
const healthRoutes_1 = __importDefault(require("@/routes/healthRoutes"));
const PerformanceMonitoringService_1 = __importDefault(require("@/services/PerformanceMonitoringService"));
const CacheService_1 = require("@/services/CacheService");
const connection_1 = __importDefault(require("@/database/connection"));
const mockConnection_1 = __importDefault(require("@/database/mockConnection"));
const errorHandler_1 = require("@/middleware/errorHandler");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Performance monitoring middleware (should be first)
app.use(PerformanceMonitoringService_1.default.requestMonitoringMiddleware());
// Security middleware
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Mount health check routes
app.use('/health', healthRoutes_1.default);
// Mount API routes
app.use('/', routes_1.default);
// Initialize WebSocket service
// WebSocket service disabled for now
// const webSocketService = new WebSocketService(io, db);
// webSocketService.initialize();
// Error handling middleware (must be last)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const PORT = config_1.default.port;
// Setup global error handlers
(0, errorHandler_1.handleUnhandledRejection)();
(0, errorHandler_1.handleUncaughtException)();
// Initialize services
async function initializeServices() {
    try {
        // Try to initialize cache service (optional)
        try {
            const cacheService = new CacheService_1.CacheService();
            await cacheService.connect();
            logger_1.default.info('Cache service connected');
        }
        catch (error) {
            logger_1.default.warn('Cache service not available, continuing without cache:', error.message);
        }
        // Try to run database migrations (use mock if real DB not available)
        try {
            await connection_1.default.runMigrations();
            logger_1.default.info('Database migrations completed');
        }
        catch (error) {
            logger_1.default.warn('Database not available, using mock database:', error.message);
            await mockConnection_1.default.runMigrations();
        }
        // Start performance monitoring
        setInterval(() => {
            PerformanceMonitoringService_1.default.logPerformanceSummary();
        }, 300000); // Log performance summary every 5 minutes
        logger_1.default.info('All services initialized successfully');
    }
    catch (error) {
        logger_1.default.error('Failed to initialize services:', error);
        // Don't exit in development, continue with limited functionality
        if (config_1.default.nodeEnv === 'production') {
            process.exit(1);
        }
    }
}
server.listen(PORT, async () => {
    logger_1.default.info(`Server running on port ${PORT}`);
    logger_1.default.info(`Environment: ${config_1.default.nodeEnv}`);
    await initializeServices();
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('HTTP server closed');
    });
    // Close database connections
    try {
        await connection_1.default.close();
    }
    catch (error) {
        logger_1.default.warn('Error closing database connection:', error.message);
    }
    // Close cache connections
    try {
        const cacheService = new CacheService_1.CacheService();
        await cacheService.disconnect();
    }
    catch (error) {
        logger_1.default.warn('Error closing cache connection:', error.message);
    }
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger_1.default.info('HTTP server closed');
    });
    // Close database connections
    try {
        await connection_1.default.close();
    }
    catch (error) {
        logger_1.default.warn('Error closing database connection:', error.message);
    }
    // Close cache connections
    try {
        const cacheService = new CacheService_1.CacheService();
        await cacheService.disconnect();
    }
    catch (error) {
        logger_1.default.warn('Error closing cache connection:', error.message);
    }
    process.exit(0);
});
//# sourceMappingURL=index.js.map