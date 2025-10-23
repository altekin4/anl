// Test setup file for frontend tests

// Mock Socket.IO globally
global.io = jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false
}));

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Mock window methods that might not be available in JSDOM
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {
        return null;
    }
    disconnect() {
        return null;
    }
    unobserve() {
        return null;
    }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() {}
    observe() {
        return null;
    }
    disconnect() {
        return null;
    }
    unobserve() {
        return null;
    }
};

// Mock CSS custom properties
const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
CSSStyleDeclaration.prototype.setProperty = function(property, value, priority) {
    this[property] = value;
    return originalSetProperty.call(this, property, value, priority);
};

const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
CSSStyleDeclaration.prototype.getPropertyValue = function(property) {
    return this[property] || originalGetPropertyValue.call(this, property);
};

// Mock scrollTo and scroll behavior
Element.prototype.scrollTo = jest.fn();
window.scrollTo = jest.fn();

// Mock touch events
if (!window.TouchEvent) {
    window.TouchEvent = class TouchEvent extends Event {
        constructor(type, options = {}) {
            super(type, options);
            this.touches = options.touches || [];
            this.targetTouches = options.targetTouches || [];
            this.changedTouches = options.changedTouches || [];
        }
    };
}

// Setup DOM environment
beforeEach(() => {
    // Reset document head and body
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    
    // Add basic meta tags
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(viewport);
    
    // Reset window dimensions to default
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
    });
    Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 768
    });
});

afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
    
    // Clean up any event listeners
    document.removeEventListener = jest.fn();
    window.removeEventListener = jest.fn();
});