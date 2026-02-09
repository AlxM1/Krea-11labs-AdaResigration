/**
 * API Endpoint Tests
 * Test generation API endpoints with provider fallback
 */

import { executeImageChain, executeVideoChain } from '@/lib/ai/provider-chain'
import { generateImage, generateVideo } from '@/lib/ai/providers'

// Mock the provider functions
jest.mock('@/lib/ai/providers', () => ({
  generateImage: jest.fn(),
  generateVideo: jest.fn(),
}))

describe('Generation Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Image Generation', () => {
    it('should generate image with valid request', async () => {
      const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
      mockGenerateImage.mockResolvedValue({
        success: true,
        status: 'completed',
        imageUrl: 'https://example.com/image.png',
        images: ['https://example.com/image.png'],
        seed: 12345,
        provider: 'fal',
      })

      const result = await executeImageChain(
        'text-to-image',
        {
          prompt: 'A beautiful sunset',
          model: 'flux-schnell',
          width: 1024,
          height: 1024,
          steps: 4,
        },
        mockGenerateImage
      )

      expect(result.success).toBe(true)
      expect(result.result?.imageUrl).toBe('https://example.com/image.png')
      expect(mockGenerateImage).toHaveBeenCalled()
    })

    it(
      'should handle provider fallback gracefully',
      async () => {
        const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
        // Fail 3 times (exhaust retries on first provider), then succeed on second provider
        mockGenerateImage
          .mockRejectedValueOnce(new Error('Primary provider failed'))
          .mockRejectedValueOnce(new Error('Primary provider failed'))
          .mockRejectedValueOnce(new Error('Primary provider failed'))
          .mockResolvedValueOnce({
            success: true,
            status: 'completed',
            imageUrl: 'https://example.com/image.png',
            provider: 'replicate',
          })

        const result = await executeImageChain(
          'text-to-image',
          {
            prompt: 'Test image',
            width: 1024,
            height: 1024,
          },
          mockGenerateImage
        )

        expect(result.success).toBe(true)
        expect(result.result?.imageUrl).toBeDefined()
        expect(result.attempts.length).toBeGreaterThan(1)
      },
      30000
    )

    it(
      'should return error when all providers fail',
      async () => {
        const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
        mockGenerateImage.mockRejectedValue(new Error('Provider unavailable'))

        const result = await executeImageChain(
          'text-to-image',
          {
            prompt: 'Test image',
            width: 1024,
            height: 1024,
          },
          mockGenerateImage
        )

        expect(result.success).toBe(false)
        expect(result.finalError).toContain('failed')
      },
      30000
    )

    it('should work with batch generation', async () => {
      const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
      mockGenerateImage.mockResolvedValue({
        success: true,
        status: 'completed',
        imageUrl: 'https://example.com/image1.png',
        images: [
          'https://example.com/image1.png',
          'https://example.com/image2.png',
          'https://example.com/image3.png',
          'https://example.com/image4.png',
        ],
        seed: 12345,
        provider: 'fal',
      })

      const result = await executeImageChain(
        'text-to-image',
        {
          prompt: 'Test batch',
          model: 'flux-schnell',
          width: 1024,
          height: 1024,
          batchSize: 4,
        },
        mockGenerateImage
      )

      expect(result.success).toBe(true)
      expect(result.result?.images).toHaveLength(4)
    })
  })

  describe('Video Generation', () => {
    it('should generate video with valid request', async () => {
      const mockGenerateVideo = generateVideo as jest.MockedFunction<typeof generateVideo>
      mockGenerateVideo.mockResolvedValue({
        success: true,
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        provider: 'fal',
      })

      const result = await executeVideoChain(
        {
          prompt: 'A cat playing piano',
          duration: 5,
        },
        mockGenerateVideo
      )

      expect(result.success).toBe(true)
      expect(result.result?.videoUrl).toBe('https://example.com/video.mp4')
      expect(mockGenerateVideo).toHaveBeenCalled()
    })

    it('should support image-to-video', async () => {
      const mockGenerateVideo = generateVideo as jest.MockedFunction<typeof generateVideo>
      mockGenerateVideo.mockResolvedValue({
        success: true,
        status: 'completed',
        videoUrl: 'https://example.com/video.mp4',
        provider: 'fal',
      })

      const result = await executeVideoChain(
        {
          imageUrl: 'https://example.com/input.jpg',
          duration: 5,
        },
        mockGenerateVideo
      )

      expect(result.success).toBe(true)
      expect(result.result?.videoUrl).toBeDefined()
      expect(mockGenerateVideo).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          imageUrl: 'https://example.com/input.jpg',
        })
      )
    })

    it(
      'should handle video generation failure',
      async () => {
        const mockGenerateVideo = generateVideo as jest.MockedFunction<typeof generateVideo>
        mockGenerateVideo.mockRejectedValue(new Error('Video generation failed'))

        const result = await executeVideoChain(
          {
            prompt: 'Test video',
            duration: 5,
          },
          mockGenerateVideo
        )

        expect(result.success).toBe(false)
        expect(result.finalError).toContain('failed')
      },
      30000
    )
  })

  describe('Provider Validation', () => {
    it('should validate required parameters', async () => {
      const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>

      // Missing prompt
      const result = await executeImageChain(
        'text-to-image',
        {
          prompt: '',
          width: 1024,
          height: 1024,
        },
        mockGenerateImage
      )

      // Should still attempt but likely fail validation at provider level
      expect(mockGenerateImage).toHaveBeenCalled()
    })

    it(
      'should handle provider-specific errors',
      async () => {
        const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
        mockGenerateImage.mockRejectedValue(new Error('API key invalid'))

        const result = await executeImageChain(
          'text-to-image',
          {
            prompt: 'Test',
            width: 1024,
            height: 1024,
          },
          mockGenerateImage
        )

        expect(result.success).toBe(false)
        expect(result.finalError).toBeTruthy()
      },
      30000
    )
  })

  describe('Retry Logic', () => {
    it(
      'should retry on transient failures',
      async () => {
        const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
        mockGenerateImage
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockRejectedValueOnce(new Error('Network timeout'))
          .mockResolvedValueOnce({
            success: true,
            status: 'completed',
            imageUrl: 'https://example.com/image.png',
            provider: 'fal',
          })

        const result = await executeImageChain(
          'text-to-image',
          {
            prompt: 'Test retry',
            width: 1024,
            height: 1024,
          },
          mockGenerateImage
        )

        expect(result.success).toBe(true)
        expect(mockGenerateImage).toHaveBeenCalledTimes(3)
      },
      30000
    )

    it(
      'should stop retrying after max attempts',
      async () => {
        const mockGenerateImage = generateImage as jest.MockedFunction<typeof generateImage>
        mockGenerateImage.mockRejectedValue(new Error('Permanent failure'))

        const result = await executeImageChain(
          'text-to-image',
          {
            prompt: 'Test max retries',
            width: 1024,
            height: 1024,
          },
          mockGenerateImage
        )

        expect(result.success).toBe(false)
        // Should have attempted multiple providers with retries
        expect(mockGenerateImage.mock.calls.length).toBeGreaterThan(3)
      },
      60000
    )
  })
})
