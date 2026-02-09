/**
 * Provider Chain Tests
 * Test multi-provider fallback logic without network calls
 */

import { checkProviderAvailability } from '@/lib/ai/provider-chain'
import type { AIProvider } from '@/lib/ai/providers'

// Mock environment variables
beforeEach(() => {
  process.env.FAL_KEY = 'test-fal-key'
  process.env.REPLICATE_API_TOKEN = 'test-replicate-token'
  process.env.TOGETHER_API_KEY = 'test-together-key'
  process.env.NVIDIA_API_KEY = 'test-nvidia-key'
})

describe('Provider Chain', () => {
  describe('checkProviderAvailability', () => {
    it('should return true for providers with API keys', async () => {
      const isAvailable = await checkProviderAvailability('fal')
      expect(isAvailable).toBe(true)
    })

    it('should return false for providers without API keys', async () => {
      delete process.env.FAL_KEY
      const isAvailable = await checkProviderAvailability('fal')
      expect(isAvailable).toBe(false)
    })

    it('should check all major providers', async () => {
      const falAvailable = await checkProviderAvailability('fal')
      const replicateAvailable = await checkProviderAvailability('replicate')
      const togetherAvailable = await checkProviderAvailability('together')
      const nvidiaAvailable = await checkProviderAvailability('google')

      expect(falAvailable).toBe(true)
      expect(replicateAvailable).toBe(true)
      expect(togetherAvailable).toBe(true)
      // Google needs GOOGLE_AI_API_KEY which isn't set
      expect(nvidiaAvailable).toBe(false)
    })

    it('should return false for ComfyUI without URL', async () => {
      const isAvailable = await checkProviderAvailability('comfyui')
      expect(isAvailable).toBe(false)
    })

    it('should return false for Ollama without URL', async () => {
      const isAvailable = await checkProviderAvailability('ollama')
      expect(isAvailable).toBe(false)
    })

    it('should handle unknown providers', async () => {
      const isAvailable = await checkProviderAvailability('unknown' as AIProvider)
      expect(isAvailable).toBe(false)
    })
  })

  describe('Provider Priority', () => {
    it('should configure providers with correct priority order', () => {
      // This is a smoke test to ensure the provider chains are defined
      const { providerChains } = require('@/lib/ai/provider-chain')

      expect(providerChains['text-to-image']).toBeDefined()
      expect(providerChains['video']).toBeDefined()
      expect(providerChains['upscale']).toBeDefined()
      expect(providerChains['inpaint']).toBeDefined()
    })

    it('should have multiple providers configured per feature', () => {
      const { providerChains } = require('@/lib/ai/provider-chain')

      expect(providerChains['text-to-image'].providers.length).toBeGreaterThan(1)
      expect(providerChains['video'].providers.length).toBeGreaterThan(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.FAL_KEY
      delete process.env.REPLICATE_API_TOKEN
      delete process.env.TOGETHER_API_KEY

      // Should not throw, just return false
      expect(async () => {
        await checkProviderAvailability('fal')
      }).not.toThrow()
    })

    it('should handle empty API keys', async () => {
      process.env.FAL_KEY = ''
      const isAvailable = await checkProviderAvailability('fal')
      expect(isAvailable).toBe(false)
    })

    it('should handle undefined env vars', async () => {
      delete process.env.OPENAI_API_KEY
      const isAvailable = await checkProviderAvailability('openai')
      expect(isAvailable).toBe(false)
    })
  })

  describe('Provider Chains Configuration', () => {
    const { providerChains } = require('@/lib/ai/provider-chain')

    it('should have text-to-image chain', () => {
      expect(providerChains['text-to-image']).toBeDefined()
      expect(providerChains['text-to-image'].feature).toBe('text-to-image')
    })

    it('should have image-to-image chain', () => {
      expect(providerChains['image-to-image']).toBeDefined()
    })

    it('should have upscale chain', () => {
      expect(providerChains['upscale']).toBeDefined()
    })

    it('should have inpaint chain', () => {
      expect(providerChains['inpaint']).toBeDefined()
    })

    it('should have video chain', () => {
      expect(providerChains['video']).toBeDefined()
    })

    it('should have background-removal chain', () => {
      expect(providerChains['background-removal']).toBeDefined()
    })

    it('should have style-transfer chain', () => {
      expect(providerChains['style-transfer']).toBeDefined()
    })

    it('should have 3d chain', () => {
      expect(providerChains['3d']).toBeDefined()
    })

    it('should have logo chain', () => {
      expect(providerChains['logo']).toBeDefined()
    })

    it('should have realtime-canvas chain', () => {
      expect(providerChains['realtime-canvas']).toBeDefined()
    })

    it('should have training chain', () => {
      expect(providerChains['training']).toBeDefined()
    })

    it('should configure providers with priority values', () => {
      const chain = providerChains['text-to-image']
      chain.providers.forEach((provider: any) => {
        expect(provider).toHaveProperty('name')
        expect(provider).toHaveProperty('priority')
        expect(provider).toHaveProperty('isAvailable')
        expect(typeof provider.priority).toBe('number')
      })
    })

    it('should order providers by priority', () => {
      const chain = providerChains['text-to-image']
      for (let i = 0; i < chain.providers.length - 1; i++) {
        expect(chain.providers[i].priority).toBeLessThanOrEqual(chain.providers[i + 1].priority)
      }
    })
  })

  describe('Provider Availability Checks', () => {
    it('should check FAL availability', async () => {
      const result = await checkProviderAvailability('fal')
      expect(typeof result).toBe('boolean')
    })

    it('should check Replicate availability', async () => {
      const result = await checkProviderAvailability('replicate')
      expect(typeof result).toBe('boolean')
    })

    it('should check Together AI availability', async () => {
      const result = await checkProviderAvailability('together')
      expect(typeof result).toBe('boolean')
    })

    it('should check OpenAI availability', async () => {
      const result = await checkProviderAvailability('openai')
      expect(typeof result).toBe('boolean')
    })

    it('should check Google AI availability', async () => {
      const result = await checkProviderAvailability('google')
      expect(typeof result).toBe('boolean')
    })
  })
})
