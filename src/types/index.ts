import { Request } from 'express';
import { MatchResult } from '../services/FuzzyMatcher';

// Express Request extension
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Core data types
export interface University {
  id: number;
  name: string;
  city: string;
  type: 'Devlet' | 'Vakıf';
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: number;
  universityId: number;
  name: string;
  faculty: string;
  language: string;
  aliases: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoreData {
  id: number;
  departmentId: number;
  year: number;
  scoreType: 'TYT' | 'SAY' | 'EA' | 'SOZ' | 'DIL';
  baseScore: number;
  ceilingScore: number;
  baseRank: number;
  ceilingRank: number;
  quota: number;
  createdAt: Date;
}

// Chat related types
export interface ChatMessage {
  id: string;
  userId: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
  metadata?: {
    intent?: string;
    entities?: Record<string, any>;
  };
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

// NLP types
export interface NLPRequest {
  text: string;
  context?: ConversationContext;
  userId: string;
}

export interface NLPResponse {
  intent: 'net_calculation' | 'base_score' | 'quota_inquiry' | 'department_search' | 'clarification_needed';
  entities: {
    university?: string;
    department?: string;
    language?: string;
    scoreType?: string;
    targetScore?: number;
  };
  confidence: number;
  clarificationNeeded?: string[];
}

export interface ConversationContext {
  sessionId?: string;
  previousIntent?: string;
  extractedEntities?: Record<string, any>;
  conversationHistory?: string[];
}

// Calculator types
export interface NetCalculation {
  targetScore: number;
  safetyMargin: number;
  requiredNets: {
    TYT: { min: number; max: number };
    AYT?: { min: number; max: number };
  };
  basedOnYear: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface CalculationRequest {
  university: string;
  department: string;
  language?: string;
  scoreType: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    suggestions?: string[];
  };
  fallbackData?: any;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Service interfaces
export interface IDataService {
  getUniversities(): Promise<University[]>;
  getDepartments(universityId?: number): Promise<Department[]>;
  getScoreData(departmentId: number, year?: number): Promise<ScoreData[]>;
  searchUniversities(query: string): Promise<MatchResult<University>[]>;
  searchDepartments(query: string, universityId?: number): Promise<MatchResult<Department>[]>;
}

export interface INLPService {
  processMessage(request: NLPRequest): Promise<NLPResponse>;
  extractEntities(text: string): Promise<Record<string, any>>;
  classifyIntent(text: string): Promise<string>;
}

export interface ICalculatorService {
  calculateRequiredNets(request: CalculationRequest): Promise<NetCalculation>;
  getNetValues(scoreType: string): Promise<Record<string, number>>;
}

export interface IChatService {
  createSession(userId: string): Promise<ChatSession>;
  sendMessage(sessionId: string, message: string): Promise<ChatMessage>;
  getSessionHistory(sessionId: string): Promise<ChatMessage[]>;
  endSession(sessionId: string): Promise<void>;
}

// Configuration types
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface EOSConfig {
  apiBaseUrl: string;
  apiKey: string;
}