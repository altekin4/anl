"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EOSNavigationService = void 0;
const logger_1 = __importDefault(require("@/utils/logger"));
/**
 * Server-side stub for EOS Navigation Service
 * This provides a no-op implementation for server-side rendering
 */
class EOSNavigationService {
    constructor() {
        this.isEOSContext = false;
        this.currentBreadcrumbs = [];
        this.navigationHistory = [];
        logger_1.default.debug('EOSNavigationService initialized (server-side stub)');
    }
    static getInstance() {
        if (!EOSNavigationService.instance) {
            EOSNavigationService.instance = new EOSNavigationService();
        }
        return EOSNavigationService.instance;
    }
    // No-op methods for server-side compatibility
    initializeEOSContext() {
        logger_1.default.debug('EOS context initialization skipped (server-side)');
    }
    applyEOSTheme(config) {
        logger_1.default.debug('EOS theme application skipped (server-side)');
    }
    updateBreadcrumbs(breadcrumbs) {
        this.currentBreadcrumbs = breadcrumbs;
        logger_1.default.debug('Breadcrumbs updated (server-side)', breadcrumbs);
    }
    addBackButton(targetUrl = '/eos') {
        logger_1.default.debug('Back button addition skipped (server-side)');
    }
    navigateBack() {
        logger_1.default.debug('Navigation back skipped (server-side)');
    }
    navigateToEOS() {
        logger_1.default.debug('EOS navigation skipped (server-side)');
    }
    notifyEOSParent(data) {
        logger_1.default.debug('EOS parent notification skipped (server-side)', data);
    }
    setupEOSMessageListener() {
        logger_1.default.debug('EOS message listener setup skipped (server-side)');
    }
    updateUserInfo(user) {
        logger_1.default.debug('User info update skipped (server-side)', user);
    }
    isInEOSContext() {
        return false; // Always false on server-side
    }
    handleEOSIntegration() {
        logger_1.default.debug('EOS integration handling skipped (server-side)');
    }
    getBreadcrumbs() {
        return this.currentBreadcrumbs;
    }
    getNavigationHistory() {
        return this.navigationHistory;
    }
}
exports.EOSNavigationService = EOSNavigationService;
//# sourceMappingURL=EOSNavigationService.server.js.map