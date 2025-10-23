import { Router } from 'express';
import { Pool } from 'pg';
import calculatorRoutes from './calculator';
import { createChatRoutes } from './chat';
import eosRoutes from './eosRoutes';

export const createRoutes = (db: Pool): Router => {
  const router = Router();

  // Mount route modules
  router.use('/api/calculator', calculatorRoutes);
  router.use('/api/chat', createChatRoutes(db));
  router.use('/api/eos', eosRoutes);

  return router;
};

// For backward compatibility - include chat routes with mock database
import mockDb from '@/database/mockConnection';

const router = Router();
router.use('/api/calculator', calculatorRoutes);
router.use('/api/chat', createChatRoutes(mockDb.getPool()));
router.use('/api/eos', eosRoutes);

export default router;