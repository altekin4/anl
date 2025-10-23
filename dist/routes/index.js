"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = void 0;
const express_1 = require("express");
const calculator_1 = __importDefault(require("./calculator"));
const chat_1 = require("./chat");
const eosRoutes_1 = __importDefault(require("./eosRoutes"));
const createRoutes = (db) => {
    const router = (0, express_1.Router)();
    // Mount route modules
    router.use('/api/calculator', calculator_1.default);
    router.use('/api/chat', (0, chat_1.createChatRoutes)(db));
    router.use('/api/eos', eosRoutes_1.default);
    return router;
};
exports.createRoutes = createRoutes;
// For backward compatibility - include chat routes with mock database
const mockConnection_1 = __importDefault(require("@/database/mockConnection"));
const router = (0, express_1.Router)();
router.use('/api/calculator', calculator_1.default);
router.use('/api/chat', (0, chat_1.createChatRoutes)(mockConnection_1.default.getPool()));
router.use('/api/eos', eosRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map