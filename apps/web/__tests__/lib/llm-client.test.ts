/**
 * LLM Client Tests
 * Test LLM integration with provider chain (NVIDIA NIM → Together AI → Ollama)
 */

import { LLMClient } from '@/lib/llm/client'

// Mock fetch globally
global.fetch = jest.fn()

describe('LLMClient', () => {
  let llmClient: LLMClient

  beforeEach(() => {
    jest.clearAllMocks()
    llmClient = new LLMClient()

    // Set up environment variables
    process.env.NVIDIA_API_KEY = 'test-nvidia-key'
    process.env.TOGETHER_API_KEY = 'test-together-key'
    process.env.OLLAMA_URL = 'http://localhost:11434'
  })

  describe('enhancePrompt', () => {
    it('should enhance a short prompt using NVIDIA NIM', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'A beautiful sunset over the ocean, golden hour lighting, dramatic clouds, vibrant colors, professional photography, high detail, 8k resolution'
            }
          }]
        })
      })

      const enhanced = await llmClient.enhancePrompt('sunset over ocean')

      expect(enhanced).toContain('sunset')
      expect(enhanced).toContain('ocean')
      expect(enhanced.length).toBeGreaterThan('sunset over ocean'.length)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nvidia.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-nvidia-key'
          })
        })
      )
    })

    it('should fallback to Together AI when NVIDIA NIM fails', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('NVIDIA NIM unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'Enhanced prompt from Together AI'
              }
            }]
          })
        })

      const enhanced = await llmClient.enhancePrompt('test prompt')

      expect(enhanced).toContain('Together AI')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should fallback to Ollama when cloud providers fail', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('NVIDIA NIM unavailable'))
        .mockRejectedValueOnce(new Error('Together AI unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            response: 'Enhanced prompt from Ollama'
          })
        })

      const enhanced = await llmClient.enhancePrompt('test prompt')

      expect(enhanced).toContain('Ollama')
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('should return original prompt when all providers fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('All providers down'))

      const original = 'test prompt'
      const enhanced = await llmClient.enhancePrompt(original)

      expect(enhanced).toBe(original)
    })

    it('should not enhance already detailed prompts', async () => {
      const detailedPrompt = 'A highly detailed, photorealistic portrait of a woman, golden hour lighting, professional photography, 8k resolution, shallow depth of field, bokeh background'

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: detailedPrompt // LLM returns similar prompt
            }
          }]
        })
      })

      const enhanced = await llmClient.enhancePrompt(detailedPrompt)

      expect(enhanced.length).toBeGreaterThanOrEqual(detailedPrompt.length * 0.8)
    })
  })

  describe('generateNegativePrompt', () => {
    it('should generate negative prompts based on positive prompt', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'ugly, distorted, blurry, low quality, deformed, bad anatomy'
            }
          }]
        })
      })

      const negative = await llmClient.generateNegativePrompt('beautiful portrait')

      expect(negative).toContain('blurry')
      expect(negative.length).toBeGreaterThan(0)
    })

    it('should include style-specific negative prompts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'extra limbs, deformed hands, bad proportions, distorted face'
            }
          }]
        })
      })

      const negative = await llmClient.generateNegativePrompt('anime character', 'anime')

      expect(negative.length).toBeGreaterThan(0)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('anime')
        })
      )
    })

    it('should return default negative prompt on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('LLM unavailable'))

      const negative = await llmClient.generateNegativePrompt('test')

      expect(negative).toContain('low quality')
      expect(negative).toContain('blurry')
    })
  })

  describe('suggestStyles', () => {
    it('should suggest art styles based on prompt', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify([
                { style: 'Photorealistic', reason: 'Best for lifelike portraits', model: 'FLUX Pro' },
                { style: 'Cinematic', reason: 'Dramatic lighting works well', model: 'SDXL' },
                { style: 'Oil Painting', reason: 'Classical subject matter', model: 'SD 1.5' }
              ])
            }
          }]
        })
      })

      const suggestions = await llmClient.suggestStyles('portrait of a woman')

      expect(suggestions).toHaveLength(3)
      expect(suggestions[0]).toHaveProperty('style')
      expect(suggestions[0]).toHaveProperty('reason')
      expect(suggestions[0]).toHaveProperty('model')
    })

    it('should return empty array on parse error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      })

      const suggestions = await llmClient.suggestStyles('test')

      expect(suggestions).toEqual([])
    })
  })

  describe('parseSearchQuery', () => {
    it('should parse natural language search query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                timeRange: 'last_week',
                style: 'anime',
                subject: 'portrait',
                model: null
              })
            }
          }]
        })
      })

      const filters = await llmClient.parseSearchQuery('show me my anime portraits from last week')

      expect(filters.timeRange).toBe('last_week')
      expect(filters.style).toBe('anime')
      expect(filters.subject).toBe('portrait')
    })

    it('should handle complex queries', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                timeRange: 'last_month',
                style: 'photorealistic',
                subject: 'landscape',
                model: 'FLUX Pro'
              })
            }
          }]
        })
      })

      const filters = await llmClient.parseSearchQuery(
        'find photorealistic landscapes generated with FLUX last month'
      )

      expect(filters.model).toBe('FLUX Pro')
      expect(filters.style).toBe('photorealistic')
    })

    it('should return empty filters on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('LLM down'))

      const filters = await llmClient.parseSearchQuery('test query')

      expect(filters).toEqual({})
    })
  })

  describe('Provider Availability', () => {
    it('should work with only NVIDIA NIM', async () => {
      // Temporarily remove other providers
      delete process.env.TOGETHER_API_KEY
      delete process.env.OLLAMA_URL

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Enhanced' } }]
        }),
      } as Response)

      const enhanced = await llmClient.enhancePrompt('test')

      expect(enhanced).toBe('Enhanced')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Restore in beforeEach
    })

    it('should work with only Together AI', async () => {
      delete process.env.NVIDIA_API_KEY
      delete process.env.OLLAMA_URL

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Enhanced via Together' } }]
        }),
      } as Response)

      const enhanced = await llmClient.enhancePrompt('test')

      expect(enhanced).toBe('Enhanced via Together')
    })

    it('should work with only Ollama', async () => {
      delete process.env.NVIDIA_API_KEY
      delete process.env.TOGETHER_API_KEY

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          response: 'Enhanced via Ollama'
        }),
      } as Response)

      const enhanced = await llmClient.enhancePrompt('test')

      expect(enhanced).toBe('Enhanced via Ollama')
    })

    it('should handle no providers configured', async () => {
      delete process.env.NVIDIA_API_KEY
      delete process.env.TOGETHER_API_KEY
      delete process.env.OLLAMA_URL

      const original = 'test prompt'
      const enhanced = await llmClient.enhancePrompt(original)

      expect(enhanced).toBe(original)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
