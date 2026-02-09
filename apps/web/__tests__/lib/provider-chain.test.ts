/**
 * Provider Chain Fallback Tests
 * Test multi-provider fallback logic with health checks and retry
 */

import {
  executeImageChain,
  executeVideoChain,
  checkProviderAvailability,
  ChainExecutionResult,
} from '@/lib/ai/provider-chain'
import { AIProvider, GenerationRequest, GenerationResponse } from '@/lib/ai/providers'

// Mock fetch globally
global.fetch = jest.fn()

describe('Provider Chain', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.FAL_KEY = 'test-fal-key'
    process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
    process.env.TOGETHER_API_KEY = 'test-together-key'
    process.env.COMFYUI_URL = 'http://localhost:8188'
  })

  describe('executeImageChain', () => {
    const mockRequest: GenerationRequest = {
      prompt: 'A beautiful sunset',
      width: 1024,
      height: 1024,
      steps: 4,
    }

    it('should use primary provider when available', async () => {
      const mockGenerateFn = jest.fn().mockResolvedValue({
        success: true,
        imageUrl: 'https://example.com/image.png',
        provider: 'fal',
      })

      const result = await executeImageChain('text-to-image', mockRequest, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('fal')
      expect(mockGenerateFn).toHaveBeenCalledTimes(1)
    })

    it('should fallback to secondary provider when primary fails', async () => {
      const mockGenerateFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fal.ai unavailable'))
        .mockResolvedValueOnce({
          success: true,
          imageUrl: 'https://example.com/image.png',
          provider: 'replicate',
        })

      const result = await executeImageChain('text-to-image', mockRequest, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('replicate')
      expect(mockGenerateFn).toHaveBeenCalledTimes(2)
      expect(result.attemptedProviders).toContain('fal')
      expect(result.attemptedProviders).toContain('replicate')
    })

    it('should return error when all providers fail', async () => {
      const mockGenerateFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fal.ai unavailable'))
        .mockRejectedValueOnce(new Error('Replicate unavailable'))
        .mockRejectedValueOnce(new Error('Together AI unavailable'))
        .mockRejectedValueOnce(new Error('ComfyUI unavailable'))

      const result = await executeImageChain('text-to-image', mockRequest, mockGenerateFn)

      expect(result.success).toBe(false)
      expect(result.finalError).toContain('All providers failed')
      expect(mockGenerateFn).toHaveBeenCalled()
      expect(result.attemptedProviders.length).toBeGreaterThan(0)
    })

    it('should skip providers without API keys', async () => {
      // Remove API keys
      delete process.env.FAL_KEY
      delete process.env.REPLICATE_API_TOKEN
      process.env.TOGETHER_API_KEY = 'test-key'

      const mockGenerateFn = jest.fn().mockResolvedValue({
        success: true,
        imageUrl: 'https://example.com/image.png',
        provider: 'together',
      })

      const result = await executeImageChain('text-to-image', mockRequest, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('together')
      // Should not attempt fal or replicate since they have no keys
      expect(result.attemptedProviders).not.toContain('fal')
      expect(result.attemptedProviders).not.toContain('replicate')
    })

    it('should handle no providers configured gracefully', async () => {
      // Remove all API keys
      delete process.env.FAL_KEY
      delete process.env.REPLICATE_API_TOKEN
      delete process.env.TOGETHER_API_KEY
      delete process.env.COMFYUI_URL
      delete process.env.GPU_SERVER_HOST

      const mockGenerateFn = jest.fn()

      const result = await executeImageChain('text-to-image', mockRequest, mockGenerateFn)

      expect(result.success).toBe(false)
      expect(result.finalError).toContain('No providers configured')
      expect(mockGenerateFn).not.toHaveBeenCalled()
    })
  })

  describe('executeVideoChain', () => {
    const mockRequest = {
      prompt: 'A cat playing piano',
      duration: 5,
    }

    it('should use primary video provider', async () => {
      const mockGenerateFn = jest.fn().mockResolvedValue({
        success: true,
        videoUrl: 'https://example.com/video.mp4',
        provider: 'fal',
      })

      const result = await executeVideoChain(mockRequest, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('fal')
    })

    it('should fallback for video generation', async () => {
      const mockGenerateFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fal.ai video unavailable'))
        .mockResolvedValueOnce({
          success: true,
          videoUrl: 'https://example.com/video.mp4',
          provider: 'replicate',
        })

      const result = await executeVideoChain(mockRequest, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(result.provider).toBe('replicate')
      expect(result.attemptedProviders).toContain('fal')
    })
  })

  describe('checkProviderAvailability', () => {
    it('should return true for providers with API keys', async () => {
      const isHealthy = await checkProviderAvailability('fal')
      expect(isHealthy).toBe(true)
    })

    it('should return false for providers without API keys', async () => {
      delete process.env.FAL_KEY
      const isHealthy = await checkProviderAvailability('fal')
      expect(isHealthy).toBe(false)
    })

    it('should check ComfyUI server availability', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })

      const isHealthy = await checkProviderAvailability('comfyui')
      expect(isHealthy).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('system_stats'),
        expect.any(Object)
      )
    })

    it('should return false when ComfyUI is unreachable', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))

      const isHealthy = await checkProviderAvailability('comfyui')
      expect(isHealthy).toBe(false)
    })

    it('should timeout health checks after 5 seconds', async () => {
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      )

      const startTime = Date.now()
      const isHealthy = await checkProviderAvailability('comfyui')
      const duration = Date.now() - startTime

      expect(isHealthy).toBe(false)
      expect(duration).toBeLessThan(6000) // Should timeout before 6 seconds
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const mockGenerateFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          imageUrl: 'https://example.com/image.png',
          provider: 'fal',
        })

      const result = await executeImageChain('text-to-image', {
        prompt: 'test',
        width: 1024,
        height: 1024,
      }, mockGenerateFn)

      expect(result.success).toBe(true)
      expect(mockGenerateFn).toHaveBeenCalledTimes(3)
    })

    it('should stop retrying after max attempts', async () => {
      const mockGenerateFn = jest.fn().mockRejectedValue(new Error('Permanent failure'))

      const result = await executeImageChain('text-to-image', {
        prompt: 'test',
        width: 1024,
        height: 1024,
      }, mockGenerateFn)

      expect(result.success).toBe(false)
      // Should attempt multiple providers, each with retries
      expect(mockGenerateFn.mock.calls.length).toBeGreaterThan(1)
    })
  })
})
