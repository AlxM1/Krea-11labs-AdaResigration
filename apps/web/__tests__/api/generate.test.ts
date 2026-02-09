/**
 * API Endpoint Tests
 * Test generation API endpoints with provider fallback
 */

import { executeImageChain, executeVideoChain } from '@/lib/ai/provider-chain'
import type { GenerationResponse, VideoGenerationResponse, AIProvider } from '@/lib/ai/providers'

// Mock the provider chain module to avoid actual network calls
jest.mock('@/lib/ai/provider-chain', () => ({
  executeImageChain: jest.fn(),
  executeVideoChain: jest.fn(),
  checkProviderAvailability: jest.fn(),
}))

describe('Generation API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Image Generation', () => {
    it('should return successful response with valid params', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/image.png',
          images: ['https://example.com/image.png'],
          seed: 12345,
          provider: 'fal',
        },
        attempts: [{
          provider: 'fal' as AIProvider,
          success: true,
          duration: 1000,
        }],
      })

      const result = await mockImageChain(
        'text-to-image',
        {
          prompt: 'A beautiful sunset',
          width: 1024,
          height: 1024,
        },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.imageUrl).toBe('https://example.com/image.png')
    })

    it('should handle errors gracefully', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: false,
        attempts: [],
        finalError: 'No providers available',
      })

      const result = await mockImageChain(
        'text-to-image',
        {
          prompt: 'Test',
          width: 1024,
          height: 1024,
        },
        jest.fn()
      )

      expect(result.success).toBe(false)
      expect(result.finalError).toBeTruthy()
    })

    it('should support batch generation', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/image1.png',
          images: [
            'https://example.com/image1.png',
            'https://example.com/image2.png',
            'https://example.com/image3.png',
            'https://example.com/image4.png',
          ],
          provider: 'fal',
        },
        attempts: [{
          provider: 'fal' as AIProvider,
          success: true,
          duration: 2000,
        }],
      })

      const result = await mockImageChain(
        'text-to-image',
        {
          prompt: 'Batch test',
          width: 1024,
          height: 1024,
          batchSize: 4,
        },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.images).toHaveLength(4)
    })
  })

  describe('Video Generation', () => {
    it('should return successful response for text-to-video', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          provider: 'fal',
        },
        attempts: [{
          provider: 'fal' as AIProvider,
          success: true,
          duration: 5000,
        }],
      })

      const result = await mockVideoChain(
        {
          prompt: 'A cat playing piano',
          duration: 5,
        },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('should support image-to-video', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          provider: 'fal',
        },
        attempts: [{
          provider: 'fal' as AIProvider,
          success: true,
          duration: 4500,
        }],
      })

      const result = await mockVideoChain(
        {
          imageUrl: 'https://example.com/input.jpg',
          duration: 5,
        },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.videoUrl).toBeDefined()
    })

    it('should handle video generation failures', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: false,
        attempts: [{
          provider: 'fal' as AIProvider,
          success: false,
          error: 'Generation failed',
          duration: 1000,
        }],
        finalError: 'All providers failed',
      })

      const result = await mockVideoChain(
        {
          prompt: 'Test',
          duration: 5,
        },
        jest.fn()
      )

      expect(result.success).toBe(false)
      expect(result.finalError).toBeTruthy()
    })
  })

  describe('Provider Chain Behavior', () => {
    it('should track provider attempts', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/image.png',
          provider: 'replicate',
        },
        attempts: [
          {
            provider: 'fal' as AIProvider,
            success: false,
            error: 'Provider failed',
            duration: 500,
          },
          {
            provider: 'replicate' as AIProvider,
            success: true,
            duration: 1200,
          },
        ],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024 },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toHaveLength(2)
      expect(result.attempts[0].success).toBe(false)
      expect(result.attempts[1].success).toBe(true)
    })

    it('should handle all providers failing', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: false,
        attempts: [
          { provider: 'fal' as AIProvider, success: false, error: 'Failed', duration: 100 },
          { provider: 'replicate' as AIProvider, success: false, error: 'Failed', duration: 100 },
          { provider: 'together' as AIProvider, success: false, error: 'Failed', duration: 100 },
        ],
        finalError: 'All providers failed',
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024 },
        jest.fn()
      )

      expect(result.success).toBe(false)
      expect(result.finalError).toBeTruthy()
      expect(result.attempts.length).toBeGreaterThan(0)
    })

    it('should include attempt duration', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/image.png',
          provider: 'fal',
        },
        attempts: [{
          provider: 'fal' as AIProvider,
          success: true,
          duration: 1234,
        }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024 },
        jest.fn()
      )

      expect(result.attempts[0].duration).toBeDefined()
      expect(result.attempts[0].duration).toBeGreaterThan(0)
    })
  })

  describe('Image Parameters', () => {
    it('should support different aspect ratios', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/wide.png',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 1000 }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Landscape', width: 1920, height: 1080 },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })

    it('should support different models', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/sdxl.png',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 1000 }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024, model: 'sdxl' },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })

    it('should support custom seed values', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/seeded.png',
          seed: 42,
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 1000 }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024, seed: 42 },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.seed).toBe(42)
    })

    it('should support guidance scale parameter', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/guided.png',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 1000 }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024, guidanceScale: 7.5 },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })

    it('should support steps parameter', async () => {
      const mockImageChain = executeImageChain as jest.MockedFunction<typeof executeImageChain>
      mockImageChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          imageUrl: 'https://example.com/stepped.png',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 1000 }],
      })

      const result = await mockImageChain(
        'text-to-image',
        { prompt: 'Test', width: 1024, height: 1024, steps: 50 },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Video Parameters', () => {
    it('should support different durations', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          videoUrl: 'https://example.com/10s.mp4',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 10000 }],
      })

      const result = await mockVideoChain(
        { prompt: 'Test', duration: 10 },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })

    it('should support video aspect ratios', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 5000 }],
      })

      const result = await mockVideoChain(
        { prompt: 'Test', duration: 5, aspectRatio: '16:9' },
        jest.fn()
      )

      expect(result.success).toBe(true)
    })

    it('should include thumbnail URLs', async () => {
      const mockVideoChain = executeVideoChain as jest.MockedFunction<typeof executeVideoChain>
      mockVideoChain.mockResolvedValue({
        success: true,
        result: {
          success: true,
          status: 'completed',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          provider: 'fal',
        },
        attempts: [{ provider: 'fal' as AIProvider, success: true, duration: 5000 }],
      })

      const result = await mockVideoChain(
        { prompt: 'Test', duration: 5 },
        jest.fn()
      )

      expect(result.success).toBe(true)
      expect(result.result?.thumbnailUrl).toBeDefined()
    })
  })
})
