class ChatInterface {
    constructor() {
        this.apiUrl = '/api';
        this.sessionId = null;
        this.isConnected = false;
        this.messageHistory = [];
        this.currentPage = 1;
        this.messagesPerPage = 20;
        this.isLoadingHistory = false;
        this.hasMoreHistory = true;
        this.eosIntegration = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeEOSIntegration();
        this.initializeWebSocket();
        this.setupAutoResize();
        this.setupInfiniteScroll();
    }
    
    initializeElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatForm = document.getElementById('chatForm');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.charCount = document.querySelector('.char-count');
    }
    
    initializeEventListeners() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Input events
        this.messageInput.addEventListener('input', () => {
            this.updateCharCount();
            this.updateSendButton();
        });
        
        // Enter key handling
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.sendButton.disabled) {
                    this.sendMessage();
                }
            }
        });
        
        // Example question clicks with touch support
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('example-question')) {
                const question = e.target.getAttribute('data-question');
                this.messageInput.value = question;
                this.updateCharCount();
                this.updateSendButton();
                this.messageInput.focus();
            }
        });
        
        // Touch feedback for mobile devices
        document.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('example-question')) {
                e.target.style.transform = 'scale(0.98)';
            }
        });
        
        document.addEventListener('touchend', (e) => {
            if (e.target.classList.contains('example-question')) {
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            }
        });
        
        // Connection status handling
        window.addEventListener('online', () => {
            this.showConnectionStatus('Bağlantı yeniden kuruldu', 'success');
            this.initializeWebSocket();
        });
        
        window.addEventListener('offline', () => {
            this.showConnectionStatus('İnternet bağlantısı kesildi', 'error');
        });
        
        // Orientation change handling
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.scrollToBottom();
                this.adjustViewportHeight();
            }, 100);
        });
        
        // Resize handling
        window.addEventListener('resize', () => {
            this.adjustViewportHeight();
        });
    }
    
    initializeEOSIntegration() {
        this.eosIntegration = new EOSIntegration();
        this.eosIntegration.initialize();
    }
    
    initializeWebSocket() {
        // Use HTTP API instead of WebSocket for now
        this.isConnected = true;
        this.hideConnectionStatus();
        this.createSession();
    }
    
    async createSession() {
        console.log('🔄 Creating session...');
        try {
            const response = await fetch('/api/chat/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo-user'
                },
                body: JSON.stringify({
                    userId: 'demo-user'
                })
            });
            
            console.log('📡 Session response status:', response.status);
            const data = await response.json();
            console.log('📦 Session response data:', data);
            
            if (data.success) {
                this.sessionId = data.data.sessionId;
                console.log('✅ Session created:', this.sessionId);
                this.showConnectionStatus('Bağlantı başarılı', 'success');
            } else {
                console.error('❌ Failed to create session:', data.error);
                this.showConnectionStatus('Oturum oluşturulamadı', 'error');
            }
        } catch (error) {
            console.error('💥 Error creating session:', error);
            this.showConnectionStatus('Bağlantı hatası: ' + error.message, 'error');
        }
    }
    
    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.isConnected) return;
        
        // Add user message to UI
        this.addUserMessage(message);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateCharCount();
        this.updateSendButton();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Send message via HTTP API
        console.log('📤 Sending message:', message, 'to session:', this.sessionId);
        try {
            const response = await fetch(`/api/chat/sessions/${this.sessionId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'demo-user'
                },
                body: JSON.stringify({
                    content: message,
                    userId: 'demo-user'
                })
            });
            
            console.log('📡 Message response status:', response.status);
            const data = await response.json();
            console.log('📦 Message response data:', data);
            
            this.hideTypingIndicator();
            
            if (data.success) {
                // Handle new response structure with both user and bot messages
                if (data.data.botMessage) {
                    this.addBotMessage(data.data.botMessage.content, data.data.botMessage);
                } else if (data.data.message) {
                    // Fallback for old response structure
                    this.addBotMessage(data.data.message, data.data);
                }
                console.log('✅ Message sent successfully');
            } else {
                console.error('❌ Message failed:', data.error);
                this.addBotMessage('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', { type: 'error' });
            }
        } catch (error) {
            console.error('💥 Error sending message:', error);
            this.hideTypingIndicator();
            this.addBotMessage('Bağlantı hatası: ' + error.message, { type: 'error' });
        }
        
        // Hide welcome message after first user message
        this.hideWelcomeMessage();
    }
    
    addUserMessage(message) {
        const messageElement = this.createMessageElement(message, 'user');
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        
        // Add to history
        this.messageHistory.push({
            type: 'user',
            content: message,
            timestamp: new Date()
        });
    }
    
    addBotMessage(message, metadata = {}) {
        const messageElement = this.createMessageElement(message, 'bot', metadata);
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        
        // Add to history
        this.messageHistory.push({
            type: 'bot',
            content: message,
            metadata: metadata,
            timestamp: new Date()
        });
    }
    
    createMessageElement(content, type, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Handle different content types
        if (metadata.type === 'calculation_result' && metadata.results) {
            contentDiv.innerHTML = this.formatCalculationResult(content, metadata.results);
        } else if (metadata.type === 'university_info' && metadata.universities) {
            contentDiv.innerHTML = this.formatUniversityInfo(content, metadata.universities);
        } else {
            contentDiv.innerHTML = this.formatMessage(content);
        }
        
        messageDiv.appendChild(contentDiv);
        return messageDiv;
    }
    
    formatMessage(content) {
        // Convert line breaks to HTML
        if (!content) return '';
        return content.toString().replace(/\n/g, '<br>');
    }
    
    formatCalculationResult(content, results) {
        let html = `<p>${content}</p>`;
        
        if (results && results.length > 0) {
            html += '<div class="calculation-results">';
            results.forEach(result => {
                html += `
                    <div class="result-item">
                        <strong>${result.university} - ${result.department}</strong><br>
                        <span class="score">Tahmini Puan: ${result.estimatedScore}</span><br>
                        <span class="confidence">Güven: ${result.confidence}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        return html;
    }
    
    formatUniversityInfo(content, universities) {
        let html = `<p>${content}</p>`;
        
        if (universities && universities.length > 0) {
            html += '<div class="university-results">';
            universities.forEach(uni => {
                html += `
                    <div class="university-item">
                        <strong>${uni.name}</strong><br>
                        <span class="location">${uni.city}</span><br>
                        <span class="score">Taban Puan: ${uni.baseScore || 'Belirtilmemiş'}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        return html;
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    updateCharCount() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length}/500`;
        
        if (length > 450) {
            this.charCount.style.color = '#dc3545';
        } else if (length > 400) {
            this.charCount.style.color = '#ffc107';
        } else {
            this.charCount.style.color = '#6c757d';
        }
    }
    
    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        const isConnected = this.isConnected;
        this.sendButton.disabled = !hasText || !isConnected;
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
    
    showConnectionStatus(message, type) {
        // Remove existing status
        this.hideConnectionStatus();
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `connection-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.id = 'connectionStatus';
        
        document.body.appendChild(statusDiv);
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                this.hideConnectionStatus();
            }, 3000);
        }
    }
    
    hideConnectionStatus() {
        const existing = document.getElementById('connectionStatus');
        if (existing) {
            existing.remove();
        }
    }
    
    // Public methods for external use
    clearChat() {
        this.chatMessages.innerHTML = '';
        this.messageHistory = [];
        this.currentPage = 1;
        this.hasMoreHistory = true;
        this.showWelcomeMessage();
    }
    
    getMessageHistory() {
        return this.messageHistory;
    }
    
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    
    adjustViewportHeight() {
        // Handle mobile viewport height issues
        if (window.innerWidth <= 768) {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }
    }
    
    setupInfiniteScroll() {
        this.chatMessages.addEventListener('scroll', () => {
            if (this.chatMessages.scrollTop === 0 && this.hasMoreHistory && !this.isLoadingHistory) {
                this.loadMessageHistory();
            }
        });
    }
    
    loadMessageHistory() {
        if (!this.sessionId || this.isLoadingHistory || !this.hasMoreHistory) return;
        
        this.isLoadingHistory = true;
        this.showHistoryLoader();
        
        this.socket.emit('load_history', {
            sessionId: this.sessionId,
            page: this.currentPage,
            limit: this.messagesPerPage
        });
    }
    
    handleMessageHistory(data) {
        this.isLoadingHistory = false;
        this.hideHistoryLoader();
        
        if (data.messages && data.messages.length > 0) {
            const scrollHeight = this.chatMessages.scrollHeight;
            
            // Prepend messages to the beginning
            data.messages.reverse().forEach(msg => {
                const messageElement = this.createMessageElement(
                    msg.content, 
                    msg.sender === 'user' ? 'user' : 'bot',
                    msg.metadata || {}
                );
                messageElement.classList.add('history-message');
                this.chatMessages.insertBefore(messageElement, this.chatMessages.firstChild);
            });
            
            // Maintain scroll position
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight - scrollHeight;
            
            this.currentPage++;
            this.hasMoreHistory = data.hasMore;
        } else {
            this.hasMoreHistory = false;
        }
    }
    
    showHistoryLoader() {
        if (document.getElementById('historyLoader')) return;
        
        const loader = document.createElement('div');
        loader.id = 'historyLoader';
        loader.className = 'history-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <span>Geçmiş mesajlar yükleniyor...</span>
            </div>
        `;
        
        this.chatMessages.insertBefore(loader, this.chatMessages.firstChild);
    }
    
    hideHistoryLoader() {
        const loader = document.getElementById('historyLoader');
        if (loader) {
            loader.remove();
        }
    }
    
    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && this.messageHistory.filter(m => m.type === 'user').length === 1) {
            welcomeMessage.style.transition = 'opacity 0.3s ease-out';
            welcomeMessage.style.opacity = '0';
            setTimeout(() => {
                welcomeMessage.style.display = 'none';
            }, 300);
        }
    }
    
    showWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
            welcomeMessage.style.opacity = '1';
        }
    }
}

// Connection status styles
const statusStyles = `
.connection-status {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
}

.connection-status.success {
    background: #28a745;
}

.connection-status.warning {
    background: #ffc107;
    color: #212529;
}

.connection-status.error {
    background: #dc3545;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.calculation-results,
.university-results {
    margin-top: 16px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #667eea;
}

.result-item,
.university-item {
    padding: 12px 0;
    border-bottom: 1px solid #e9ecef;
}

.result-item:last-child,
.university-item:last-child {
    border-bottom: none;
}

.score {
    color: #28a745;
    font-weight: 500;
}

.confidence {
    color: #6c757d;
    font-size: 14px;
}

.location {
    color: #6c757d;
    font-style: italic;
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = statusStyles;
document.head.appendChild(styleSheet);

// EOS Platform Integration
class EOSIntegration {
    constructor() {
        this.platformConfig = null;
        this.isEmbedded = false;
        this.eosToken = null;
    }
    
    initialize() {
        this.checkEmbeddedMode();
        this.setupMessageListener();
        this.loadEOSToken();
        
        if (this.isEmbedded) {
            this.requestPlatformConfig();
            this.applyEmbeddedStyles();
        }
    }
    
    checkEmbeddedMode() {
        this.isEmbedded = window.parent !== window || 
                         document.referrer.includes('/eos') ||
                         window.location.search.includes('eos=true');
        
        if (this.isEmbedded) {
            document.body.classList.add('eos-embedded');
        }
    }
    
    loadEOSToken() {
        this.eosToken = localStorage.getItem('eos-token') || 
                       new URLSearchParams(window.location.search).get('token');
        
        if (this.eosToken) {
            localStorage.setItem('eos-token', this.eosToken);
        }
    }
    
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'eos-platform') {
                this.handlePlatformMessage(event.data);
            }
        });
    }
    
    handlePlatformMessage(data) {
        switch (data.action) {
            case 'config-response':
                this.applyPlatformConfig(data.config);
                break;
            case 'theme-update':
                this.applyTheme(data.theme);
                break;
            case 'user-update':
                this.handleUserUpdate(data.user);
                break;
        }
    }
    
    requestPlatformConfig() {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'eos-navigation',
                action: 'request-config',
                module: 'tercih-sihirbazi'
            }, '*');
        }
    }
    
    applyPlatformConfig(config) {
        this.platformConfig = config;
        
        if (config.theme) {
            this.applyTheme(config.theme);
        }
        
        this.createBreadcrumb();
        this.createBackButton();
        
        if (config.user) {
            this.displayUserInfo(config.user);
        }
    }
    
    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme.primaryColor) root.style.setProperty('--eos-primary-color', theme.primaryColor);
        if (theme.secondaryColor) root.style.setProperty('--eos-secondary-color', theme.secondaryColor);
        if (theme.backgroundColor) root.style.setProperty('--eos-background-color', theme.backgroundColor);
        if (theme.textColor) root.style.setProperty('--eos-text-color', theme.textColor);
        if (theme.headerColor) root.style.setProperty('--eos-header-color', theme.headerColor);
        if (theme.fontFamily) root.style.setProperty('--eos-font-family', theme.fontFamily);
        
        document.body.classList.add('eos-theme');
    }
    
    applyEmbeddedStyles() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.height = '100vh';
            chatContainer.style.maxWidth = 'none';
            chatContainer.style.borderRadius = '0';
            chatContainer.style.boxShadow = 'none';
        }
    }
    
    createBreadcrumb() {
        const existingBreadcrumb = document.querySelector('.eos-breadcrumb');
        if (existingBreadcrumb) return;
        
        const breadcrumb = document.createElement('nav');
        breadcrumb.className = 'eos-breadcrumb';
        breadcrumb.setAttribute('aria-label', 'Breadcrumb');
        
        breadcrumb.innerHTML = `
            <ol class="eos-breadcrumb-list">
                <li class="eos-breadcrumb-item">
                    <a href="/eos" class="eos-breadcrumb-link">EOS Platform</a>
                </li>
                <li class="eos-breadcrumb-item current" aria-current="page">
                    Tercih Sihirbazı
                </li>
            </ol>
        `;
        
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.insertBefore(breadcrumb, chatContainer.firstChild);
        }
    }
    
    createBackButton() {
        const existingButton = document.querySelector('.eos-back-button');
        if (existingButton) return;
        
        const backButton = document.createElement('button');
        backButton.className = 'eos-back-button';
        backButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.5 2.5L3 8l5.5 5.5L9.5 12 5.5 8l4-4L8.5 2.5z"/>
            </svg>
            EOS Platform'a Dön
        `;
        
        backButton.addEventListener('click', () => {
            this.navigateBackToPlatform();
        });
        
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatHeader.insertBefore(backButton, chatHeader.firstChild);
        }
    }
    
    displayUserInfo(user) {
        const existingInfo = document.querySelector('.eos-user-info');
        if (existingInfo) {
            existingInfo.textContent = `${user.username} (${user.role})`;
            return;
        }
        
        const userInfo = document.createElement('div');
        userInfo.className = 'eos-user-info';
        userInfo.textContent = `${user.username} (${user.role})`;
        
        const chatHeader = document.querySelector('.chat-header');
        if (chatHeader) {
            chatHeader.appendChild(userInfo);
        }
    }
    
    handleUserUpdate(user) {
        this.displayUserInfo(user);
        
        if (user.token) {
            this.eosToken = user.token;
            localStorage.setItem('eos-token', user.token);
        }
    }
    
    navigateBackToPlatform() {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'eos-navigation',
                action: 'navigate-back',
                module: 'tercih-sihirbazi'
            }, '*');
        } else {
            window.location.href = '/eos';
        }
    }
    
    getAuthHeaders() {
        const headers = {};
        
        if (this.eosToken) {
            headers['X-EOS-Token'] = this.eosToken;
        }
        
        return headers;
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatInterface = new ChatInterface();
    window.chatInterface.adjustViewportHeight();
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatInterface, EOSIntegration };
}