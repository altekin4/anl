import logger from '@/utils/logger';

export interface EOSNavigationItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  order: number;
  isActive: boolean;
  permissions?: string[];
}

export interface EOSTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headerColor: string;
  sidebarColor: string;
  fontFamily: string;
}

export interface EOSPlatformConfig {
  platformName: string;
  logoUrl: string;
  theme: EOSTheme;
  navigation: EOSNavigationItem[];
  userMenuItems: EOSNavigationItem[];
}

export interface BreadcrumbItem {
  text: string;
  href: string;
  isCurrent: boolean;
}

export interface EOSUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  token: string;
}

/**
 * Server-side stub for EOS Navigation Service
 * This provides a no-op implementation for server-side rendering
 */
export class EOSNavigationService {
  private static instance: EOSNavigationService;
  private isEOSContext: boolean = false;
  private currentBreadcrumbs: BreadcrumbItem[] = [];
  private navigationHistory: string[] = [];

  private constructor() {
    logger.debug('EOSNavigationService initialized (server-side stub)');
  }

  static getInstance(): EOSNavigationService {
    if (!EOSNavigationService.instance) {
      EOSNavigationService.instance = new EOSNavigationService();
    }
    return EOSNavigationService.instance;
  }

  // No-op methods for server-side compatibility
  initializeEOSContext(): void {
    logger.debug('EOS context initialization skipped (server-side)');
  }

  applyEOSTheme(config: EOSPlatformConfig): void {
    logger.debug('EOS theme application skipped (server-side)');
  }

  updateBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void {
    this.currentBreadcrumbs = breadcrumbs;
    logger.debug('Breadcrumbs updated (server-side)', breadcrumbs);
  }

  addBackButton(targetUrl: string = '/eos'): void {
    logger.debug('Back button addition skipped (server-side)');
  }

  navigateBack(): void {
    logger.debug('Navigation back skipped (server-side)');
  }

  navigateToEOS(): void {
    logger.debug('EOS navigation skipped (server-side)');
  }

  notifyEOSParent(data: any): void {
    logger.debug('EOS parent notification skipped (server-side)', data);
  }

  setupEOSMessageListener(): void {
    logger.debug('EOS message listener setup skipped (server-side)');
  }

  updateUserInfo(user: EOSUser): void {
    logger.debug('User info update skipped (server-side)', user);
  }

  isInEOSContext(): boolean {
    return false; // Always false on server-side
  }

  handleEOSIntegration(): void {
    logger.debug('EOS integration handling skipped (server-side)');
  }

  getBreadcrumbs(): BreadcrumbItem[] {
    return this.currentBreadcrumbs;
  }

  getNavigationHistory(): string[] {
    return this.navigationHistory;
  }
}