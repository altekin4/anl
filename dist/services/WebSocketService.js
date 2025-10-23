"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const ChatService_1 = require("./ChatService");
const errors_1 = require("@/utils/errors");
const logger_1 = __importDefault(require("@/utils/logger"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("@/config"));
class WebSocketService {
    constructor(httpServer, db) {
        this.connectedUsers = new Map(); // userId -> Set of socket IDs
        this.userSessions = new Map(); // socketId -> sessionId
        this.chatService = new ChatService_1.ChatService(db);
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.query.token;
                const sessionId = socket.handshake.auth.sessionId || socket.handshake.query.sessionId;
                if (!token) {
                    throw new errors_1.UnauthorizedError('Authentication token required');
                }
                // Verify JWT token
                const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
                const userId = decoded.userId || decoded.id;
                if (!userId) {
                    throw new errors_1.UnauthorizedError('Invalid token: user ID not found');
                }
                // Verify session if provided
                if (sessionId) {
                    const session = await this.chatService.getSession(sessionId);
                    if (!session || session.userId !== userId.toString()) {
                        throw new errors_1.UnauthorizedError('Invalid session or access denied');
                    }
                    socket.sessionId = sessionId;
                }
                socket.userId = userId.toString();
                next();
            }
            catch (error) {
                logger_1.default.error('WebSocket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info(`WebSocket client connected: ${socket.id}, user: ${socket.userId}`);
            // Track connected user
            if (socket.userId) {
                if (!this.connectedUsers.has(socket.userId)) {
                    this.connectedUsers.set(socket.userId, new Set());
                }
                this.connectedUsers.get(socket.userId).add(socket.id);
                // Join user-specific room for notifications
                socket.join(`user:${socket.userId}`);
                // Join session room if session ID is provided
                if (socket.sessionId) {
                    socket.join(`session:${socket.sessionId}`);
                    this.userSessions.set(socket.id, socket.sessionId);
                }
            }
            // Handle joining a chat session
            socket.on('join_session', async (data) => {
                try {
                    const { sessionId } = data;
                    if (!socket.userId) {
                        throw new errors_1.UnauthorizedError('User not authenticated');
                    }
                    // Verify session access
                    const session = await this.chatService.getSession(sessionId);
                    if (session.userId !== socket.userId) {
                        throw new errors_1.UnauthorizedError('Access denied to this session');
                    }
                    // Leave previous session room if any
                    if (socket.sessionId) {
                        socket.leave(`session:${socket.sessionId}`);
                    }
                    // Join new session room
                    socket.join(`session:${sessionId}`);
                    socket.sessionId = sessionId;
                    this.userSessions.set(socket.id, sessionId);
                    socket.emit('session_joined', { sessionId });
                    logger_1.default.debug(`User ${socket.userId} joined session ${sessionId}`);
                }
                catch (error) {
                    logger_1.default.error('Error joining session:', error);
                    socket.emit('error', { message: 'Failed to join session' });
                }
            });
            // Handle leaving a chat session
            socket.on('leave_session', () => {
                if (socket.sessionId) {
                    socket.leave(`session:${socket.sessionId}`);
                    this.userSessions.delete(socket.id);
                    const sessionId = socket.sessionId;
                    socket.sessionId = undefined;
                    socket.emit('session_left', { sessionId });
                    logger_1.default.debug(`User ${socket.userId} left session ${sessionId}`);
                }
            });
            // Handle sending a message
            socket.on('send_message', async (data) => {
                try {
                    const { sessionId, content } = data;
                    if (!socket.userId) {
                        throw new errors_1.UnauthorizedError('User not authenticated');
                    }
                    if (!content || content.trim().length === 0) {
                        throw new errors_1.ValidationError('Message content is required');
                    }
                    if (content.length > 1000) {
                        throw new errors_1.ValidationError('Message content too long');
                    }
                    // Send message through chat service
                    const message = await this.chatService.sendMessage(sessionId, content, socket.userId);
                    // Broadcast message to all clients in the session
                    this.io.to(`session:${sessionId}`).emit('message_received', {
                        message: message.toJSON(),
                        sessionId
                    });
                    logger_1.default.debug(`Message sent via WebSocket in session ${sessionId}`);
                }
                catch (error) {
                    logger_1.default.error('Error sending message via WebSocket:', error);
                    socket.emit('error', {
                        message: error instanceof Error ? error.message : 'Failed to send message'
                    });
                }
            });
            // Handle typing indicators
            socket.on('typing_start', (data) => {
                if (socket.userId && data.sessionId) {
                    socket.to(`session:${data.sessionId}`).emit('user_typing', {
                        userId: socket.userId,
                        sessionId: data.sessionId
                    });
                }
            });
            socket.on('typing_stop', (data) => {
                if (socket.userId && data.sessionId) {
                    socket.to(`session:${data.sessionId}`).emit('user_stopped_typing', {
                        userId: socket.userId,
                        sessionId: data.sessionId
                    });
                }
            });
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                logger_1.default.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
                // Clean up tracking
                if (socket.userId) {
                    const userSockets = this.connectedUsers.get(socket.userId);
                    if (userSockets) {
                        userSockets.delete(socket.id);
                        if (userSockets.size === 0) {
                            this.connectedUsers.delete(socket.userId);
                        }
                    }
                }
                if (socket.sessionId) {
                    this.userSessions.delete(socket.id);
                }
            });
            // Send welcome message
            socket.emit('connected', {
                message: 'WebSocket connection established',
                userId: socket.userId,
                sessionId: socket.sessionId
            });
        });
    }
    // Method to send bot response via WebSocket
    async sendBotResponse(sessionId, content, metadata) {
        try {
            // Get session to get user ID
            const session = await this.chatService.getSession(sessionId);
            // Add bot response to database
            const botMessage = await this.chatService.addBotResponse(sessionId, content, metadata);
            // Broadcast to all clients in the session
            this.io.to(`session:${sessionId}`).emit('message_received', {
                message: botMessage.toJSON(),
                sessionId
            });
            logger_1.default.debug(`Bot response sent via WebSocket in session ${sessionId}`);
        }
        catch (error) {
            logger_1.default.error('Error sending bot response via WebSocket:', error);
        }
    }
    // Method to notify user about session events
    notifyUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }
    // Method to check if user is online
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    // Method to get online users count
    getOnlineUsersCount() {
        return this.connectedUsers.size;
    }
    // Method to get connected sockets for a user
    getUserSocketCount(userId) {
        return this.connectedUsers.get(userId)?.size || 0;
    }
    // Method to broadcast system message
    broadcastSystemMessage(message) {
        this.io.emit('system_message', { message, timestamp: new Date() });
    }
    // Method to send session-specific notification
    notifySession(sessionId, event, data) {
        this.io.to(`session:${sessionId}`).emit(event, data);
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map