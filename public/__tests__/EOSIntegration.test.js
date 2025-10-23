/**
 * @jest-environment jsdom
 */

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Import the classes after setting up mocks
const { EOSIntegration } = require('../script.js');

describe('EOS Integration Frontend Tests', () => {
  let eosIntegration;
  let mockParent;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="chat-container">
        <header class="chat-header">
          <h1>Tercih Sihirbazı</h1>
          <p>Test description</p>
        </header>
        <div class="chat-messages" id="chatMessages"></div>
      </div>
    `;

    // Mock window.parent
    mockParent = {
      postMessage: jest.fn()
    };
    
    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    
    eosIntegration = new EOSIntegration();
  });

  describe('Embedded Mode Detection', () => {
    it('should detect embedded mode when parent window differs', () => {
      // Mock window.parent !== window
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true
      });

      eosIntegration.checkEmbeddedMode();

      expect(eosIntegration.isEmbedded).toBe(true);
      expect(document.body.classList.contains('eos-embedded')).toBe(true);
    });

    it('should detect embedded mode from referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://example.com/eos/dashboard',
        writable: true
      });

      eosIntegration.checkEmbeddedMode();

      expect(eosIntegration.isEmbedded).toBe(true);
    });

    it('should detect embedded mode from URL parameter', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?eos=true&token=test-token'
        },
        writable: true
      });

      eosIntegration.checkEmbeddedMode();

      expect(eosIntegration.isEmbedded).toBe(true);
    });

    it('should not detect embedded mode in standalone', () => {
      Object.defineProperty(window, 'parent', {
        value: window,
        writable: true
      });
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com',
        writable: true
      });
      Object.defineProperty(window, 'location', {
        value: {
          search: ''
        },
        writable: true
      });

      eosIntegration.checkEmbeddedMode();

      expect(eosIntegration.isEmbedded).toBe(false);
      expect(document.body.classList.contains('eos-embedded')).toBe(false);
    });
  });

  describe('Token Management', () => {
    it('should load token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('stored-token');

      eosIntegration.loadEOSToken();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('eos-token');
      expect(eosIntegration.eosToken).toBe('stored-token');
    });

    it('should load token from URL parameter', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?token=url-token'
        },
        writable: true
      });

      eosIntegration.loadEOSToken();

      expect(eosIntegration.eosToken).toBe('url-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eos-token', 'url-token');
    });

    it('should prioritize localStorage over URL parameter', () => {
      localStorageMock.getItem.mockReturnValue('stored-token');
      Object.defineProperty(window, 'location', {
        value: {
          search: '?token=url-token'
        },
        writable: true
      });

      eosIntegration.loadEOSToken();

      expect(eosIntegration.eosToken).toBe('stored-token');
    });
  });

  describe('Platform Configuration', () => {
    it('should apply platform configuration correctly', () => {
      const mockConfig = {
        theme: {
          primaryColor: '#ff0000',
          secondaryColor: '#00ff00',
          backgroundColor: '#0000ff'
        },
        user: {
          id: 'user123',
          username: 'testuser',
          role: 'student'
        }
      };

      eosIntegration.applyPlatformConfig(mockConfig);

      expect(eosIntegration.platformConfig).toEqual(mockConfig);
      expect(document.documentElement.style.getPropertyValue('--eos-primary-color')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--eos-secondary-color')).toBe('#00ff00');
      expect(document.documentElement.style.getPropertyValue('--eos-background-color')).toBe('#0000ff');
      expect(document.body.classList.contains('eos-theme')).toBe(true);
    });

    it('should create breadcrumb navigation', () => {
      eosIntegration.createBreadcrumb();

      const breadcrumb = document.querySelector('.eos-breadcrumb');
      expect(breadcrumb).toBeTruthy();
      expect(breadcrumb.querySelector('.eos-breadcrumb-link')).toBeTruthy();
      expect(breadcrumb.textContent).toContain('EOS Platform');
      expect(breadcrumb.textContent).toContain('Tercih Sihirbazı');
    });

    it('should create back button', () => {
      eosIntegration.createBackButton();

      const backButton = document.querySelector('.eos-back-button');
      expect(backButton).toBeTruthy();
      expect(backButton.textContent).toContain('EOS Platform\'a Dön');
    });

    it('should display user information', () => {
      const mockUser = {
        username: 'testuser',
        role: 'student'
      };

      eosIntegration.displayUserInfo(mockUser);

      const userInfo = document.querySelector('.eos-user-info');
      expect(userInfo).toBeTruthy();
      expect(userInfo.textContent).toBe('testuser (student)');
    });
  });

  describe('Message Handling', () => {
    it('should handle platform configuration message', () => {
      const mockConfig = {
        theme: { primaryColor: '#ff0000' },
        user: { username: 'testuser', role: 'student' }
      };

      const mockEvent = {
        data: {
          type: 'eos-platform',
          action: 'config-response',
          config: mockConfig
        }
      };

      eosIntegration.handlePlatformMessage(mockEvent.data);

      expect(eosIntegration.platformConfig).toEqual(mockConfig);
      expect(document.documentElement.style.getPropertyValue('--eos-primary-color')).toBe('#ff0000');
    });

    it('should handle theme update message', () => {
      const mockTheme = {
        primaryColor: '#00ff00',
        backgroundColor: '#ffffff'
      };

      const mockEvent = {
        data: {
          type: 'eos-platform',
          action: 'theme-update',
          theme: mockTheme
        }
      };

      eosIntegration.handlePlatformMessage(mockEvent.data);

      expect(document.documentElement.style.getPropertyValue('--eos-primary-color')).toBe('#00ff00');
      expect(document.documentElement.style.getPropertyValue('--eos-background-color')).toBe('#ffffff');
    });

    it('should handle user update message', () => {
      const mockUser = {
        username: 'updateduser',
        role: 'admin',
        token: 'new-token'
      };

      const mockEvent = {
        data: {
          type: 'eos-platform',
          action: 'user-update',
          user: mockUser
        }
      };

      eosIntegration.handlePlatformMessage(mockEvent.data);

      expect(eosIntegration.eosToken).toBe('new-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('eos-token', 'new-token');
    });
  });

  describe('Navigation', () => {
    it('should navigate back to platform via postMessage when embedded', () => {
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true
      });

      eosIntegration.navigateBackToPlatform();

      expect(mockParent.postMessage).toHaveBeenCalledWith({
        type: 'eos-navigation',
        action: 'navigate-back',
        module: 'tercih-sihirbazi'
      }, '*');
    });

    it('should navigate back via location.href when not embedded', () => {
      Object.defineProperty(window, 'parent', {
        value: window,
        writable: true
      });

      const mockLocation = {
        href: ''
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      eosIntegration.navigateBackToPlatform();

      expect(mockLocation.href).toBe('/eos');
    });

    it('should request platform configuration when embedded', () => {
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true
      });

      eosIntegration.requestPlatformConfig();

      expect(mockParent.postMessage).toHaveBeenCalledWith({
        type: 'eos-navigation',
        action: 'request-config',
        module: 'tercih-sihirbazi'
      }, '*');
    });
  });

  describe('Embedded Styles', () => {
    it('should apply embedded styles correctly', () => {
      eosIntegration.applyEmbeddedStyles();

      const chatContainer = document.querySelector('.chat-container');
      expect(chatContainer.style.height).toBe('100vh');
      expect(chatContainer.style.maxWidth).toBe('none');
      expect(chatContainer.style.borderRadius).toBe('0px');
      expect(chatContainer.style.boxShadow).toBe('none');
    });
  });

  describe('Authentication Headers', () => {
    it('should return EOS token in auth headers', () => {
      eosIntegration.eosToken = 'test-token';

      const headers = eosIntegration.getAuthHeaders();

      expect(headers).toEqual({
        'X-EOS-Token': 'test-token'
      });
    });

    it('should return empty headers when no token', () => {
      eosIntegration.eosToken = null;

      const headers = eosIntegration.getAuthHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('Initialization', () => {
    it('should initialize correctly in embedded mode', async () => {
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true
      });

      await eosIntegration.initialize();

      expect(document.body.classList.contains('eos-embedded')).toBe(true);
      expect(mockParent.postMessage).toHaveBeenCalledWith({
        type: 'eos-navigation',
        action: 'request-config',
        module: 'tercih-sihirbazi'
      }, '*');
    });

    it('should initialize correctly in standalone mode', async () => {
      Object.defineProperty(window, 'parent', {
        value: window,
        writable: true
      });

      await eosIntegration.initialize();

      expect(document.body.classList.contains('eos-embedded')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle navigation errors gracefully', () => {
      Object.defineProperty(window, 'parent', {
        value: {
          postMessage: jest.fn().mockImplementation(() => {
            throw new Error('PostMessage failed');
          })
        },
        writable: true
      });

      const mockLocation = {
        href: ''
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      });

      expect(() => eosIntegration.navigateBackToPlatform()).not.toThrow();
      expect(mockLocation.href).toBe('/eos');
    });

    it('should handle theme application errors gracefully', () => {
      // Mock a theme that causes an error
      const mockTheme = {
        primaryColor: null // Invalid value
      };

      expect(() => eosIntegration.applyTheme(mockTheme)).not.toThrow();
    });
  });
});