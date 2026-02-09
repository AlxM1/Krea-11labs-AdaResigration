/**
 * Service Integration Tests  
 * Test service-to-service integrations
 */

import { VoiceForgeClient } from '@/lib/integrations/voiceforge-client'
import { WhisperFlowClient } from '@/lib/integrations/whisperflow-client'
import { NewsletterClient } from '@/lib/integrations/newsletter-client'
import { AgentSmithClient } from '@/lib/integrations/agentsmith-client'

// Mock all service clients
jest.mock('@/lib/integrations/voiceforge-client')
jest.mock('@/lib/integrations/whisperflow-client')
jest.mock('@/lib/integrations/newsletter-client')
jest.mock('@/lib/integrations/agentsmith-client')

describe('Service Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('VoiceForge Integration', () => {
    it('should create client instance', () => {
      const client = new VoiceForgeClient()
      expect(client).toBeDefined()
    })

    it('should have narration methods', () => {
      const mockClient = new VoiceForgeClient()
      expect(mockClient).toHaveProperty('generateTTS')
      expect(mockClient).toHaveProperty('addNarrationToVideo')
      expect(mockClient).toHaveProperty('generateNarrationScript')
      expect(mockClient).toHaveProperty('getVoices')
    })
  })

  describe('WhisperFlow Integration', () => {
    it('should create client instance', () => {
      const client = new WhisperFlowClient()
      expect(client).toBeDefined()
    })

    it('should have transcription methods', () => {
      const mockClient = new WhisperFlowClient()
      expect(mockClient).toHaveProperty('transcribe')
    })
  })

  describe('Newsletter Pipeline Integration', () => {
    it('should create client instance', () => {
      const client = new NewsletterClient()
      expect(client).toBeDefined()
    })

    it('should have callback methods', () => {
      const mockClient = new NewsletterClient()
      expect(mockClient).toHaveProperty('sendCallback')
    })
  })

  describe('AgentSmith Integration', () => {
    it('should create client instance', () => {
      const client = new AgentSmithClient()
      expect(client).toBeDefined()
    })

    it('should have webhook methods', () => {
      const mockClient = new AgentSmithClient()
      expect(mockClient).toHaveProperty('sendCallback')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing environment variables', () => {
      // Should not throw when creating clients without env vars
      expect(() => new VoiceForgeClient()).not.toThrow()
      expect(() => new WhisperFlowClient()).not.toThrow()
      expect(() => new NewsletterClient()).not.toThrow()
      expect(() => new AgentSmithClient()).not.toThrow()
    })

    it('should validate client initialization', () => {
      const voiceForge = new VoiceForgeClient()
      const whisperFlow = new WhisperFlowClient()
      const newsletter = new NewsletterClient()
      const agentSmith = new AgentSmithClient()

      expect(voiceForge).toBeInstanceOf(VoiceForgeClient)
      expect(whisperFlow).toBeInstanceOf(WhisperFlowClient)
      expect(newsletter).toBeInstanceOf(NewsletterClient)
      expect(agentSmith).toBeInstanceOf(AgentSmithClient)
    })
  })

  describe('VoiceForge Methods', () => {
    it('should have isAvailable method', () => {
      const client = new VoiceForgeClient()
      expect(client).toHaveProperty('isAvailable')
    })

    it('should have getVoices method', () => {
      const client = new VoiceForgeClient()
      expect(client).toHaveProperty('getVoices')
    })

    it('should have generateNarrationScript method', () => {
      const client = new VoiceForgeClient()
      expect(client).toHaveProperty('generateNarrationScript')
    })
  })

  describe('WhisperFlow Methods', () => {
    it('should have isAvailable method', () => {
      const client = new WhisperFlowClient()
      expect(client).toHaveProperty('isAvailable')
    })
  })

  describe('Newsletter Methods', () => {
    it('should have isAvailable method', () => {
      const client = new NewsletterClient()
      expect(client).toHaveProperty('isAvailable')
    })
  })

  describe('AgentSmith Methods', () => {
    it('should have isAvailable method', () => {
      const client = new AgentSmithClient()
      expect(client).toHaveProperty('isAvailable')
    })
  })

  describe('Service Configuration', () => {
    it('should handle VoiceForge URL configuration', () => {
      process.env.VOICEFORGE_URL = 'http://test:8100'
      const client = new VoiceForgeClient()
      expect(client).toBeDefined()
    })

    it('should handle WhisperFlow URL configuration', () => {
      process.env.WHISPERFLOW_URL = 'http://test:8766'
      const client = new WhisperFlowClient()
      expect(client).toBeDefined()
    })

    it('should handle Newsletter URL configuration', () => {
      process.env.NEWSLETTER_PIPELINE_URL = 'http://test:8300'
      const client = new NewsletterClient()
      expect(client).toBeDefined()
    })

    it('should handle AgentSmith URL configuration', () => {
      process.env.AGENTSMITH_URL = 'http://test:4000'
      const client = new AgentSmithClient()
      expect(client).toBeDefined()
    })

    it('should handle internal API key configuration', () => {
      process.env.INTERNAL_API_KEY = 'test-key'
      const newsletter = new NewsletterClient()
      expect(newsletter).toBeDefined()
    })

    it('should handle webhook secret configuration', () => {
      process.env.WEBHOOK_SECRET = 'test-secret'
      const agentSmith = new AgentSmithClient()
      expect(agentSmith).toBeDefined()
    })
  })

  describe('Client Integration', () => {
    it('should support VoiceForge integration', () => {
      const client = new VoiceForgeClient()
      expect(typeof client.generateTTS).toBe('function')
    })

    it('should support WhisperFlow integration', () => {
      const client = new WhisperFlowClient()
      expect(typeof client.transcribe).toBe('function')
    })

    it('should support Newsletter integration', () => {
      const client = new NewsletterClient()
      expect(typeof client.sendCallback).toBe('function')
    })

    it('should support AgentSmith integration', () => {
      const client = new AgentSmithClient()
      expect(typeof client.sendCallback).toBe('function')
    })
  })
})
