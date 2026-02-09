// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/krya_test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.REDIS_PASSWORD = 'test'
process.env.REDIS_DB = '15'
process.env.FAL_KEY = 'test-fal-key'
process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
process.env.TOGETHER_API_KEY = 'test-together-key'
process.env.NVIDIA_API_KEY = 'test-nvidia-key'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    generation: {
      create: jest.fn().mockResolvedValue({
        id: 'test-gen-id',
        userId: 'test-user',
        type: 'TEXT_TO_IMAGE',
        status: 'PENDING',
      }),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-gen-id',
        parameters: {},
      }),
    },
    video: {
      create: jest.fn().mockResolvedValue({
        id: 'test-video-id',
        userId: 'test-user',
        type: 'TEXT_TO_VIDEO',
        status: 'PENDING',
      }),
    },
  },
}))

// Mock auth
jest.mock('@/lib/auth', () => ({
  getOrCreateUser: jest.fn().mockResolvedValue({
    user: {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
    },
  }),
}))

// Mock queue
jest.mock('@/lib/queue', () => ({
  imageQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  },
  videoQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-2' }),
  },
  threeDQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-3' }),
  },
}))

// Mock fetch globally with default implementation
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    headers: new Map(),
  })
)

// Mock NextRequest
class MockNextRequest {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Map()

    // Handle headers
    if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value)
      })
    }

    this._bodyText = init.body
  }

  headers = {
    get: (name) => this.headers.get(name.toLowerCase()) || null,
    has: (name) => this.headers.has(name.toLowerCase()),
  }

  async json() {
    if (this._bodyText) {
      return JSON.parse(this._bodyText)
    }
    return {}
  }

  async text() {
    return this._bodyText || ''
  }
}

// Mock NextResponse
class MockNextResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Map()

    if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        this.headers.set(key, value)
      })
    }
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }

  static json(data, init = {}) {
    return new MockNextResponse(data, init)
  }
}

// Set up Next.js server mocks
global.NextRequest = MockNextRequest
global.NextResponse = MockNextResponse

// Also mock the next/server module
jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
}))

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks()

  // Reset fetch mock to default implementation (don't replace the function)
  global.fetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      headers: new Map(),
    })
  )

  // Reset env vars to defaults
  process.env.FAL_KEY = 'test-fal-key'
  process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
  process.env.TOGETHER_API_KEY = 'test-together-key'
  process.env.NVIDIA_API_KEY = 'test-nvidia-key'
})
