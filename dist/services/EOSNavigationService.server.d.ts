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
export declare class EOSNavigationService {
    private static instance;
    private isEOSContext;
    private currentBreadcrumbs;
    private navigationHistory;
    private constructor();
    static getInstance(): EOSNavigationService;
    initializeEOSContext(): void;
    applyEOSTheme(config: EOSPlatformConfig): void;
    updateBreadcrumbs(breadcrumbs: BreadcrumbItem[]): void;
    addBackButton(targetUrl?: string): void;
    navigateBack(): void;
    navigateToEOS(): void;
    notifyEOSParent(data: any): void;
    setupEOSMessageListener(): void;
    updateUserInfo(user: EOSUser): void;
    isInEOSContext(): boolean;
    handleEOSIntegration(): void;
    getBreadcrumbs(): BreadcrumbItem[];
    getNavigationHistory(): string[];
}
//# sourceMappingURL=EOSNavigationService.server.d.ts.map