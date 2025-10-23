# End-to-End Test Suite

This directory contains comprehensive end-to-end tests for the Tercih Sihirbazı application, covering complete user scenarios, cross-device functionality, and system integration.

## Test Structure

### 1. ChatFlow.e2e.test.ts
Tests complete user conversation flows including:
- **Net Score Calculation Flow**: Complete journey from question to calculation result
- **University/Department Search**: Fuzzy matching and entity extraction
- **Error Handling**: Graceful error recovery with user-friendly messages
- **Multi-turn Conversations**: Context maintenance across messages
- **Different Question Types**: Base scores, quotas, department searches, help queries
- **Rate Limiting**: Enforcement and proper error responses
- **Session Management**: Creation, retrieval, and message history

### 2. WebSocket.e2e.test.ts
Tests real-time communication features:
- **Real-time Messaging**: Bidirectional WebSocket communication
- **Typing Indicators**: Start/stop typing notifications
- **Connection Management**: Error handling, reconnection, multiple connections
- **Session Context**: Maintaining context in real-time chat
- **Performance**: Message bursts, connection stability
- **Cross-device Patterns**: Mobile-like connection patterns

### 3. API.e2e.test.ts
Tests all REST API endpoints:
- **Health Checks**: System status and detailed health information
- **Chat Session Management**: CRUD operations for sessions
- **Message Handling**: Sending, receiving, validation, history
- **Calculator Endpoints**: Net calculations, score calculations
- **Data Query Endpoints**: University/department search, score data
- **Authentication**: Token validation, authorization
- **Rate Limiting**: API-level rate limiting
- **Error Consistency**: Uniform error response format
- **Performance**: Response times, concurrent requests

### 4. CrossDevice.e2e.test.ts
Tests cross-device compatibility:
- **Responsive Design**: CSS media queries, viewport handling
- **Browser Compatibility**: Mobile and desktop browsers
- **Screen Adaptations**: Different screen sizes and orientations
- **Touch vs Mouse**: Different interaction patterns
- **Network Conditions**: Slow networks, intermittent connectivity
- **Accessibility**: ARIA attributes, keyboard navigation, screen readers
- **Performance**: Load times across devices
- **Data Optimization**: Compression, payload size optimization
- **Offline Capability**: Offline-to-online transitions

## Test Setup and Configuration

### Global Setup (globalSetup.js)
- Creates test database
- Runs database migrations
- Sets up test environment variables

### Global Teardown (globalTeardown.js)
- Cleans up test database
- Terminates connections
- Removes test artifacts

### Test Setup (setup.ts)
- Provides E2ETestSetup class for test utilities
- Manages test server lifecycle
- Provides helper methods for common operations
- Handles database seeding and cleanup

## Running Tests

### Prerequisites
1. PostgreSQL database server running
2. Redis server running (optional, will gracefully degrade)
3. Node.js and npm installed
4. Environment variables configured

### Commands
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in watch mode
npm run test:e2e:watch

# Run specific test file
npx jest --config jest.e2e.config.js ChatFlow.e2e.test.ts

# Run with coverage
npx jest --config jest.e2e.config.js --coverage
```

### Environment Variables
```bash
# Test Database Configuration
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=tercih_sihirbazi_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD=password

# Test Server Configuration
PORT=3001
NODE_ENV=test

# Optional: Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Test Data

### Universities
- Test Üniversitesi (ID: 1, İstanbul, Devlet)
- Örnek Üniversitesi (ID: 2, Ankara, Vakıf)

### Departments
- Bilgisayar Mühendisliği (Test Üniversitesi)
- İşletme (Test Üniversitesi)
- Hukuk (Örnek Üniversitesi)

### Score Data
- 2024 and 2023 data for all departments
- Various score types (SAY, EA)
- Realistic score ranges and quotas

## Test Scenarios Covered

### User Journey Testing
1. **New User Flow**
   - First visit to application
   - Session creation
   - Initial question asking
   - Follow-up questions
   - Context maintenance

2. **Returning User Flow**
   - Session retrieval
   - Message history loading
   - Continued conversation

3. **Error Recovery Flow**
   - Invalid input handling
   - System error recovery
   - Fallback responses
   - User guidance

### Question Type Coverage
1. **Net Calculation Questions**
   - "X üniversitesi Y bölümü için kaç net gerekir?"
   - "450 puan için kaç net?"
   - Follow-up clarifications

2. **Base Score Questions**
   - "X üniversitesi Y bölümü taban puanı nedir?"
   - Historical score queries

3. **Quota Questions**
   - "X üniversitesi Y bölümü kontenjanı kaç?"
   - Quota comparisons

4. **Search Questions**
   - "X üniversitesinde hangi bölümler var?"
   - Department listings

5. **Help Questions**
   - "yardım", "nasıl kullanırım?"
   - Feature explanations

### Error Condition Testing
1. **Data Not Found**
   - Non-existent universities
   - Non-existent departments
   - Missing score data

2. **Invalid Input**
   - Invalid score ranges
   - Malformed requests
   - Empty messages

3. **System Errors**
   - Database connection issues
   - External API failures
   - Rate limiting

4. **Network Issues**
   - Timeouts
   - Intermittent connectivity
   - Slow responses

### Performance Testing
1. **Load Testing**
   - Concurrent users
   - Message bursts
   - Database performance

2. **Response Time Testing**
   - API response times
   - WebSocket latency
   - Page load times

3. **Resource Usage**
   - Memory consumption
   - CPU usage
   - Database connections

### Cross-Device Testing
1. **Mobile Devices**
   - iPhone (various iOS versions)
   - Android (various versions)
   - Tablet devices

2. **Desktop Browsers**
   - Chrome, Firefox, Safari
   - Different screen resolutions
   - Various operating systems

3. **Accessibility**
   - Screen reader compatibility
   - Keyboard navigation
   - High contrast mode

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    TEST_DB_HOST: localhost
    TEST_DB_USER: postgres
    TEST_DB_PASSWORD: postgres
```

### Docker Integration
```bash
# Run tests in Docker environment
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check connection parameters
   - Verify test database permissions

2. **Port Conflicts**
   - Test server uses port 3001
   - Ensure port is available
   - Check for other running services

3. **Timeout Issues**
   - Increase test timeout values
   - Check system performance
   - Verify network connectivity

4. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify WebSocket support
   - Test with different browsers

### Debug Mode
```bash
# Run with debug output
DEBUG=* npm run test:e2e

# Run single test with verbose output
npx jest --config jest.e2e.config.js --verbose --runInBand ChatFlow.e2e.test.ts
```

## Coverage Goals

- **API Coverage**: 100% of endpoints tested
- **User Scenarios**: All major user journeys covered
- **Error Conditions**: All error types tested
- **Cross-Device**: Major device categories covered
- **Performance**: Key performance metrics validated

## Maintenance

### Regular Updates
1. Update test data when YÖK Atlas data changes
2. Add new test scenarios for new features
3. Update browser compatibility tests
4. Review and update performance benchmarks

### Test Data Refresh
```bash
# Refresh test database with latest schema
npm run test:db:refresh

# Update test data with current YÖK Atlas data
npm run test:data:update
```