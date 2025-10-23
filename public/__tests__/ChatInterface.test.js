/**
 * @jest-environment jsdom
 */

// Mock Socket.IO
const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
};

global.io = jest.fn(() => mockSocket);

// Import the ChatInterface class
const ChatInterface = require('../script.js');

describe('ChatInterface', () => {
    let chatInterface;
    let container;

    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = `
            <div class="chat-container">
                <div class="chat-messages" id="chatMessages">
                    <div class="welcome-message">
                        <div class="message bot-message">
                            <div class="message-content">
                                <p>Welcome message</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="typing-indicator" id="typingIndicator" style="display: none;">
                    <div class="message bot-message">
                        <div class="message-content">
                            <div class="typing-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-input-container">
                    <form class="chat-input-form" id="chatForm">
                        <div class="input-wrapper">
                            <textarea 
                                id="messageInput" 
                                placeholder="Type your message..." 
                                rows="1"
                                maxlength="500"
                            ></textarea>
                            <button type="submit" id="sendButton" disabled>Send</button>
                        </div>
                        <div class="input-footer">
                            <span class="char-count">0/500</span>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Reset mocks
        jest.clearAllMocks();
        
        // Create new instance
        chatInterface = new ChatInterface();
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize DOM elements correctly', () => {
            expect(chatInterface.chatMessages).toBeTruthy();
            expect(chatInterface.messageInput).toBeTruthy();
            expect(chatInterface.sendButton).toBeTruthy();
            expect(chatInterface.chatForm).toBeTruthy();
            expect(chatInterface.typingIndicator).toBeTruthy();
        });

        test('should initialize with correct default state', () => {
            expect(chatInterface.isConnected).toBe(false);
            expect(chatInterface.messageHistory).toEqual([]);
            expect(chatInterface.sessionId).toBeNull();
            expect(chatInterface.currentPage).toBe(1);
            expect(chatInterface.hasMoreHistory).toBe(true);
        });

        test('should set up WebSocket connection', () => {
            expect(global.io).toHaveBeenCalled();
            expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
            expect(mockSocket.on).toHaveBeenCalledWith('message_response', expect.any(Function));
        });
    });

    describe('Message Input', () => {
        test('should update character count on input', () => {
            const input = chatInterface.messageInput;
            const charCount = chatInterface.charCount;
            
            input.value = 'Test message';
            input.dispatchEvent(new Event('input'));
            
            expect(charCount.textContent).toBe('12/500');
        });

        test('should enable send button when input has text', () => {
            const input = chatInterface.messageInput;
            const sendButton = chatInterface.sendButton;
            
            // Initially disabled
            expect(sendButton.disabled).toBe(true);
            
            // Enable when text is added
            input.value = 'Test message';
            chatInterface.updateSendButton();
            
            expect(sendButton.disabled).toBe(true); // Still disabled because not connected
            
            // Simulate connection
            chatInterface.isConnected = true;
            chatInterface.updateSendButton();
            
            expect(sendButton.disabled).toBe(false);
        });

        test('should handle Enter key submission', () => {
            const input = chatInterface.messageInput;
            const sendSpy = jest.spyOn(chatInterface, 'sendMessage');
            
            input.value = 'Test message';
            chatInterface.isConnected = true;
            chatInterface.updateSendButton();
            
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            input.dispatchEvent(enterEvent);
            
            expect(sendSpy).toHaveBeenCalled();
        });

        test('should not submit on Shift+Enter', () => {
            const input = chatInterface.messageInput;
            const sendSpy = jest.spyOn(chatInterface, 'sendMessage');
            
            input.value = 'Test message';
            chatInterface.isConnected = true;
            
            const shiftEnterEvent = new KeyboardEvent('keydown', { 
                key: 'Enter', 
                shiftKey: true 
            });
            input.dispatchEvent(shiftEnterEvent);
            
            expect(sendSpy).not.toHaveBeenCalled();
        });
    });

    describe('Message Display', () => {
        test('should create user message element correctly', () => {
            const message = 'Test user message';
            const element = chatInterface.createMessageElement(message, 'user');
            
            expect(element.classList.contains('message')).toBe(true);
            expect(element.classList.contains('user-message')).toBe(true);
            expect(element.querySelector('.message-content').textContent).toBe(message);
        });

        test('should create bot message element correctly', () => {
            const message = 'Test bot message';
            const element = chatInterface.createMessageElement(message, 'bot');
            
            expect(element.classList.contains('message')).toBe(true);
            expect(element.classList.contains('bot-message')).toBe(true);
            expect(element.querySelector('.message-content').textContent).toBe(message);
        });

        test('should add user message to chat', () => {
            const message = 'Test user message';
            const initialChildCount = chatInterface.chatMessages.children.length;
            
            chatInterface.addUserMessage(message);
            
            expect(chatInterface.chatMessages.children.length).toBe(initialChildCount + 1);
            expect(chatInterface.messageHistory).toHaveLength(1);
            expect(chatInterface.messageHistory[0].type).toBe('user');
            expect(chatInterface.messageHistory[0].content).toBe(message);
        });

        test('should add bot message to chat', () => {
            const message = 'Test bot message';
            const initialChildCount = chatInterface.chatMessages.children.length;
            
            chatInterface.addBotMessage(message);
            
            expect(chatInterface.chatMessages.children.length).toBe(initialChildCount + 1);
            expect(chatInterface.messageHistory).toHaveLength(1);
            expect(chatInterface.messageHistory[0].type).toBe('bot');
            expect(chatInterface.messageHistory[0].content).toBe(message);
        });
    });

    describe('Typing Indicator', () => {
        test('should show typing indicator', () => {
            chatInterface.showTypingIndicator();
            
            expect(chatInterface.typingIndicator.style.display).toBe('block');
        });

        test('should hide typing indicator', () => {
            chatInterface.showTypingIndicator();
            chatInterface.hideTypingIndicator();
            
            expect(chatInterface.typingIndicator.style.display).toBe('none');
        });
    });

    describe('Welcome Message', () => {
        test('should hide welcome message after first user message', () => {
            const welcomeMessage = document.querySelector('.welcome-message');
            
            chatInterface.addUserMessage('First message');
            chatInterface.hideWelcomeMessage();
            
            expect(welcomeMessage.style.opacity).toBe('0');
        });

        test('should show welcome message when chat is cleared', () => {
            const welcomeMessage = document.querySelector('.welcome-message');
            
            chatInterface.clearChat();
            
            expect(welcomeMessage.style.display).toBe('block');
            expect(welcomeMessage.style.opacity).toBe('1');
        });
    });

    describe('Example Questions', () => {
        test('should handle example question clicks', () => {
            const exampleQuestion = document.createElement('div');
            exampleQuestion.className = 'example-question';
            exampleQuestion.setAttribute('data-question', 'Test question');
            document.body.appendChild(exampleQuestion);
            
            exampleQuestion.click();
            
            expect(chatInterface.messageInput.value).toBe('Test question');
        });
    });

    describe('Connection Status', () => {
        test('should show connection status', () => {
            chatInterface.showConnectionStatus('Test message', 'success');
            
            const statusElement = document.getElementById('connectionStatus');
            expect(statusElement).toBeTruthy();
            expect(statusElement.textContent).toBe('Test message');
            expect(statusElement.classList.contains('success')).toBe(true);
        });

        test('should hide connection status', () => {
            chatInterface.showConnectionStatus('Test message', 'success');
            chatInterface.hideConnectionStatus();
            
            const statusElement = document.getElementById('connectionStatus');
            expect(statusElement).toBeFalsy();
        });
    });

    describe('Message History', () => {
        test('should handle message history loading', () => {
            const historyData = {
                messages: [
                    { content: 'Old message 1', sender: 'user' },
                    { content: 'Old message 2', sender: 'bot' }
                ],
                hasMore: true
            };
            
            const initialChildCount = chatInterface.chatMessages.children.length;
            chatInterface.handleMessageHistory(historyData);
            
            expect(chatInterface.chatMessages.children.length).toBe(initialChildCount + 2);
            expect(chatInterface.currentPage).toBe(2);
            expect(chatInterface.hasMoreHistory).toBe(true);
        });

        test('should show and hide history loader', () => {
            chatInterface.showHistoryLoader();
            
            const loader = document.getElementById('historyLoader');
            expect(loader).toBeTruthy();
            expect(loader.classList.contains('history-loader')).toBe(true);
            
            chatInterface.hideHistoryLoader();
            
            const loaderAfterHide = document.getElementById('historyLoader');
            expect(loaderAfterHide).toBeFalsy();
        });
    });

    describe('Utility Methods', () => {
        test('should format messages correctly', () => {
            const messageWithBreaks = 'Line 1\nLine 2\nLine 3';
            const formatted = chatInterface.formatMessage(messageWithBreaks);
            
            expect(formatted).toBe('Line 1<br>Line 2<br>Line 3');
        });

        test('should clear chat correctly', () => {
            chatInterface.addUserMessage('Test message');
            chatInterface.messageHistory.push({ type: 'user', content: 'Test' });
            
            chatInterface.clearChat();
            
            expect(chatInterface.messageHistory).toEqual([]);
            expect(chatInterface.currentPage).toBe(1);
            expect(chatInterface.hasMoreHistory).toBe(true);
        });

        test('should get message history', () => {
            const testMessage = { type: 'user', content: 'Test', timestamp: new Date() };
            chatInterface.messageHistory.push(testMessage);
            
            const history = chatInterface.getMessageHistory();
            
            expect(history).toEqual([testMessage]);
        });

        test('should set session ID', () => {
            const sessionId = 'test-session-123';
            
            chatInterface.setSessionId(sessionId);
            
            expect(chatInterface.sessionId).toBe(sessionId);
        });
    });
});