# Krya Test Suite

Comprehensive test coverage for Krya AI generation platform.

## Overview

This test suite validates:
- **Provider Fallback Chains**: Multi-provider fallback with retry logic and health checks
- **LLM Integration**: Prompt enhancement, negative prompt generation, style suggestions
- **API Endpoints**: All generation endpoints with authentication and validation
- **Service Integrations**: VoiceForge, WhisperFlow, Newsletter Pipeline, AgentSmith
- **Error Handling**: Graceful degradation, user-friendly error messages
- **Manual Testing**: Comprehensive checklist for production verification

## Test Structure

```
__tests__/
├── api/
│   └── generate.test.ts         # API endpoint tests
├── lib/
│   ├── provider-chain.test.ts   # Provider fallback logic tests
│   └── llm-client.test.ts       # LLM integration tests
├── integrations/
│   └── service-integration.test.ts  # Service-to-service communication tests
├── MANUAL_TESTING_CHECKLIST.md  # Manual testing procedures
└── README.md                    # This file
```

## Setup

### Install Dependencies

```bash
cd /opt/00raiser/services/krya/apps/web
pnpm install
```

This installs:
- `jest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation

### Environment Configuration

Tests use isolated environment variables defined in `jest.setup.js`:

```javascript
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/krya_test'
process.env.REDIS_HOST = 'localhost'
process.env.FAL_KEY = 'test-fal-key'
// ... other test env vars
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

Runs Jest in watch mode. Tests will re-run when files change.

### Run Tests Once (CI Mode)

```bash
pnpm test:ci
```

Runs all tests once without watch mode. Exit code 0 = all passed, 1 = failures.

### Run with Coverage

```bash
pnpm test:coverage
```

Generates coverage report in `coverage/` directory.

### Run Specific Test File

```bash
pnpm test provider-chain
pnpm test llm-client
pnpm test generate.test
```

### Run Tests Matching Pattern

```bash
pnpm test --testNamePattern="should fallback"
```

## Test Scenarios

### Provider Chain Tests (`lib/provider-chain.test.ts`)

**Test Coverage:**
- ✅ Primary provider used when available
- ✅ Fallback to secondary provider on failure
- ✅ All providers fail → User-friendly error
- ✅ Providers without API keys skipped
- ✅ No providers configured → Graceful error
- ✅ Retry logic with exponential backoff
- ✅ Health checks timeout after 5 seconds
- ✅ ComfyUI server availability check

**Key Scenarios:**
```typescript
// Test 1: Primary provider success
FAL_KEY configured → Uses fal.ai

// Test 2: Fallback chain
FAL_KEY invalid → Falls back to Replicate → Success

// Test 3: All fail
All providers down → Error with attempted providers list

// Test 4: No keys
No API keys → "No providers configured" message
```

### LLM Client Tests (`lib/llm-client.test.ts`)

**Test Coverage:**
- ✅ Prompt enhancement via NVIDIA NIM
- ✅ Fallback to Together AI when NVIDIA fails
- ✅ Fallback to Ollama when cloud providers fail
- ✅ Return original prompt when all LLMs fail
- ✅ Negative prompt generation with style awareness
- ✅ Style suggestions with reasons and model recommendations
- ✅ Smart search query parsing
- ✅ Works with single LLM provider
- ✅ Handles no LLM providers configured

**Key Scenarios:**
```typescript
// Test 1: NVIDIA NIM enhancement
Input: "sunset"
Output: "A beautiful sunset over the ocean, golden hour lighting..."

// Test 2: Fallback chain
NVIDIA fails → Together AI → Success

// Test 3: All fail
All LLMs down → Returns original prompt "sunset"

// Test 4: No LLMs
No keys configured → Returns original prompt without fetch calls
```

### API Endpoint Tests (`api/generate.test.ts`)

**Test Coverage:**
- ✅ Image generation with valid request
- ✅ Video generation (text-to-video, image-to-video)
- ✅ 3D generation from image
- ✅ Lipsync generation
- ✅ Input validation errors
- ✅ Provider fallback in endpoints
- ✅ All providers fail → 500 error
- ✅ No providers configured → Setup message
- ✅ Authentication required

**Key Scenarios:**
```typescript
// Test 1: Valid image generation
POST /api/generate/image
Body: { prompt: "sunset", width: 1024, height: 1024 }
Response: 200, { imageUrl: "...", seed: 12345 }

// Test 2: Missing prompt
POST /api/generate/image
Body: { width: 1024, height: 1024 }
Response: 400, { error: "Prompt is required" }

// Test 3: No providers
No API keys configured
Response: 500, { error: "No providers configured", message: "..." }
```

### Service Integration Tests (`integrations/service-integration.test.ts`)

**Test Coverage:**
- ✅ VoiceForge TTS generation
- ✅ VoiceForge video narration
- ✅ WhisperFlow audio transcription
- ✅ WhisperFlow with custom prompts
- ✅ Newsletter internal API authentication
- ✅ Newsletter callback to service
- ✅ AgentSmith webhook authentication
- ✅ AgentSmith image/video/batch generation
- ✅ Service health checks
- ✅ Authentication with INTERNAL_API_KEY
- ✅ Authentication with WEBHOOK_SECRET

**Key Scenarios:**
```typescript
// Test 1: VoiceForge TTS
POST /api/integrations/voiceforge/narrate
Body: { text: "Hello world", voice: "en-US-Neural2-A" }
Response: { audioUrl: "...", duration: 5.2 }

// Test 2: WhisperFlow transcription
POST /api/integrations/whisperflow/transcribe
Body: { audioUrl: "...", language: "en" }
Response: { text: "Transcribed text", language: "en" }

// Test 3: Newsletter webhook
POST /api/internal/newsletter/generate
Headers: { X-Internal-API-Key: "valid-key" }
Response: 200, { status: "processing", jobId: "..." }

// Test 4: AgentSmith webhook
POST /api/webhooks/agentsmith
Headers: { X-Webhook-Secret: "valid-secret" }
Response: 200, { success: true, workflowId: "..." }
```

## Manual Testing

See [MANUAL_TESTING_CHECKLIST.md](./MANUAL_TESTING_CHECKLIST.md) for comprehensive manual testing procedures.

**Key Areas:**
1. Environment Setup (zero keys, single provider, multi-provider)
2. Image Generation (text-to-image, enhancement, background removal, style transfer)
3. Video Generation (text-to-video, image-to-video, motion transfer, restyle, lipsync)
4. 3D Generation (image-to-3D, viewer controls)
5. Real-time Canvas (live drawing, WebSocket)
6. Image Editor (inpainting, outpainting)
7. Logo Generation
8. Model Training
9. Workflow Editor & Execution
10. Gallery & Social Features
11. LLM Features (prompt enhancement, suggestions, search)
12. Service Integrations (VoiceForge, WhisperFlow, Newsletter, AgentSmith)
13. GPU Server Integration & Graceful Degradation
14. Settings & Configuration
15. Error Handling & Performance

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:ci

      - name: Generate coverage
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Docker Testing

```bash
# Build test container
docker compose build krya

# Run tests in container
docker compose run krya pnpm test:ci

# Run with coverage
docker compose run krya pnpm test:coverage
```

## Debugging Tests

### Run Single Test in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand provider-chain.test.ts
```

Then open Chrome DevTools → `chrome://inspect` → Click "inspect"

### View Test Output

```bash
# Verbose output
pnpm test --verbose

# Show console.log statements
pnpm test --silent=false
```

### Update Snapshots

```bash
pnpm test -u
```

## Mocking

### Global Mocks (jest.setup.js)

- `fetch` - All HTTP requests mocked
- `next/navigation` - Router mocked
- Environment variables - Test values

### Test-Specific Mocks

```typescript
// Mock specific module
jest.mock('@/lib/db', () => ({
  prisma: {
    generation: {
      create: jest.fn().mockResolvedValue({ id: 'test' }),
    },
  },
}))

// Mock fetch for specific test
global.fetch = jest.fn().mockResolvedValueOnce({
  ok: true,
  json: async () => ({ result: 'success' }),
})
```

## Coverage Goals

**Target Coverage:**
- Lines: 80%+
- Functions: 75%+
- Branches: 70%+

**Priority Files:**
- `lib/ai/provider-chain.ts` - 90%+
- `lib/llm/client.ts` - 85%+
- `app/api/generate/**` - 80%+
- `lib/integrations/**` - 75%+

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Mocks**: Always `jest.clearAllMocks()` in `beforeEach`
3. **Test Behavior**: Test what users see, not implementation details
4. **Meaningful Names**: Test names should describe scenarios clearly
5. **AAA Pattern**: Arrange, Act, Assert
6. **Edge Cases**: Test error conditions and edge cases
7. **Async Handling**: Always `await` async operations
8. **Mock External Services**: Don't call real APIs in tests

## Troubleshooting

### Tests Timeout

Increase timeout in test:
```typescript
it('should complete long operation', async () => {
  // ...
}, 30000) // 30 second timeout
```

### Mock Not Working

Check mock is defined before import:
```typescript
jest.mock('@/lib/db') // Must be at top of file

import { something } from '@/lib/db'
```

### Environment Variables Not Set

Check `jest.setup.js` has the variable defined.

### Database Connection Errors

Tests use mocked database. If you see connection errors, ensure `@/lib/db` is mocked.

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure tests pass: `pnpm test`
3. Check coverage: `pnpm test:coverage`
4. Update manual checklist if needed
5. Document new test scenarios in this README

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing/jest)

## Support

For test-related issues:
- Check test output for error details
- Review mocking setup
- Verify environment variables in `jest.setup.js`
- Run tests with `--verbose` flag
- Check coverage report for untested code paths

## License

Same as Krya project license.
