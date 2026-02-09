/**
 * Service-to-Service Integration Tests
 * Test integrations with VoiceForge, WhisperFlow, Newsletter Pipeline, and AgentSmith
 */

import { VoiceForgeClient } from '@/lib/integrations/voiceforge-client'
import { WhisperFlowClient } from '@/lib/integrations/whisperflow-client'
import { NewsletterClient } from '@/lib/integrations/newsletter-client'
import { AgentSmithClient } from '@/lib/integrations/agentsmith-client'
import { POST as agentsmithWebhook } from '@/app/api/webhooks/agentsmith/route'
import { POST as newsletterInternal } from '@/app/api/internal/newsletter/generate/route'
import { NextRequest } from 'next/server'

// Mock fetch
global.fetch = jest.fn()

describe('Service Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('VoiceForge Integration', () => {
    let voiceForgeClient: VoiceForgeClient

    beforeEach(() => {
      process.env.VOICEFORGE_URL = 'http://raiser-voiceforge:8100'
      voiceForgeClient = new VoiceForgeClient()
    })

    it('should generate TTS audio', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          audioUrl: 'https://example.com/audio.mp3',
          duration: 5.2,
        }),
      })

      const result = await voiceForgeClient.generateTTS({
        text: 'Hello world',
        voice: 'en-US-Neural2-A',
        speed: 1.0,
      })

      expect(result.audioUrl).toBe('https://example.com/audio.mp3')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts/generate'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should add narration to video', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videoUrl: 'https://example.com/video-with-audio.mp4',
        }),
      })

      const result = await voiceForgeClient.addNarrationToVideo(
        'https://example.com/video.mp4',
        'https://example.com/audio.mp3'
      )

      expect(result).toBe('https://example.com/video-with-audio.mp4')
    })

    it('should list available voices', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          voices: [
            { id: 'en-US-Neural2-A', name: 'US English Female' },
            { id: 'en-US-Neural2-B', name: 'US English Male' },
          ],
        }),
      })

      const voices = await voiceForgeClient.listVoices()

      expect(voices).toHaveLength(2)
      expect(voices[0].id).toBe('en-US-Neural2-A')
    })

    it('should handle VoiceForge unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))

      const isAvailable = await voiceForgeClient.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('WhisperFlow Integration', () => {
    let whisperFlowClient: WhisperFlowClient

    beforeEach(() => {
      process.env.WHISPERFLOW_URL = 'http://raiser-whisperflow:8766'
      whisperFlowClient = new WhisperFlowClient()
    })

    it('should transcribe audio from URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'This is the transcribed text',
          language: 'en',
          duration: 5.2,
        }),
      })

      const result = await whisperFlowClient.transcribe({
        audioUrl: 'https://example.com/audio.mp3',
        language: 'en',
      })

      expect(result.text).toBe('This is the transcribed text')
      expect(result.language).toBe('en')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transcribe'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should transcribe audio from base64', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Transcribed from base64',
          language: 'en',
        }),
      })

      const result = await whisperFlowClient.transcribe({
        audioData: 'base64-encoded-audio-data',
        language: 'en',
      })

      expect(result.text).toBe('Transcribed from base64')
    })

    it('should support custom prompts for context', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          text: 'Generate a sunset over the ocean',
          language: 'en',
        }),
      })

      const result = await whisperFlowClient.transcribe({
        audioUrl: 'https://example.com/audio.mp3',
        language: 'en',
        prompt: 'AI image generation prompt',
      })

      expect(result.text).toContain('sunset')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('AI image generation'),
        })
      )
    })

    it('should handle WhisperFlow unavailable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Service down'))

      const isAvailable = await whisperFlowClient.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('Newsletter Pipeline Integration', () => {
    let newsletterClient: NewsletterClient

    beforeEach(() => {
      process.env.NEWSLETTER_PIPELINE_URL = 'http://raiser-newsletter-pipeline:8300'
      process.env.INTERNAL_API_KEY = 'test-internal-key'
      newsletterClient = new NewsletterClient()
    })

    it('should accept internal generation requests', async () => {
      const request = new NextRequest('http://localhost:3100/api/internal/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': 'test-internal-key',
        },
        body: JSON.stringify({
          type: 'image',
          prompt: 'Newsletter header image',
          callbackUrl: 'http://raiser-newsletter-pipeline:8300/api/webhooks/krya',
          metadata: {
            newsletterId: 'newsletter-123',
          },
        }),
      })

      const response = await newsletterInternal(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('processing')
      expect(data).toHaveProperty('jobId')
    })

    it('should reject requests without valid API key', async () => {
      const request = new NextRequest('http://localhost:3100/api/internal/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': 'invalid-key',
        },
        body: JSON.stringify({
          type: 'image',
          prompt: 'Test',
        }),
      })

      const response = await newsletterInternal(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should send callback to Newsletter after generation', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ received: true }),
      })

      await newsletterClient.sendCallback({
        jobId: 'job-123',
        status: 'completed',
        result: {
          imageUrl: 'https://example.com/image.png',
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/webhooks/krya'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Internal-API-Key': 'test-internal-key',
          }),
        })
      )
    })

    it('should support batch generation requests', async () => {
      const request = new NextRequest('http://localhost:3100/api/internal/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': 'test-internal-key',
        },
        body: JSON.stringify({
          type: 'batch',
          items: [
            { prompt: 'Image 1', width: 1024, height: 1024 },
            { prompt: 'Image 2', width: 1024, height: 1024 },
          ],
          callbackUrl: 'http://raiser-newsletter-pipeline:8300/api/webhooks/krya',
        }),
      })

      const response = await newsletterInternal(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('processing')
    })
  })

  describe('AgentSmith Integration', () => {
    let agentSmithClient: AgentSmithClient

    beforeEach(() => {
      process.env.AGENTSMITH_URL = 'http://raiser-agentsmith-backend:4000'
      process.env.WEBHOOK_SECRET = 'test-webhook-secret'
      agentSmithClient = new AgentSmithClient()
    })

    it('should accept webhook from AgentSmith', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'test-webhook-secret',
        },
        body: JSON.stringify({
          workflowId: 'workflow-123',
          executionId: 'exec-456',
          action: 'generate-image',
          params: {
            prompt: 'A beautiful landscape',
            width: 1024,
            height: 1024,
          },
          callbackUrl: 'http://raiser-agentsmith-backend:4000/api/webhooks/krya',
        }),
      })

      const response = await agentsmithWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.status).toBe('processing')
      expect(data.workflowId).toBe('workflow-123')
    })

    it('should reject webhook without valid secret', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'invalid-secret',
        },
        body: JSON.stringify({
          workflowId: 'workflow-123',
          action: 'generate-image',
        }),
      })

      const response = await agentsmithWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('should support image generation action', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'test-webhook-secret',
        },
        body: JSON.stringify({
          workflowId: 'workflow-123',
          executionId: 'exec-456',
          action: 'generate-image',
          params: {
            prompt: 'Test image',
            width: 1024,
            height: 1024,
          },
        }),
      })

      const response = await agentsmithWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support video generation action', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'test-webhook-secret',
        },
        body: JSON.stringify({
          workflowId: 'workflow-123',
          executionId: 'exec-456',
          action: 'generate-video',
          params: {
            prompt: 'A cat playing',
            duration: 5,
          },
        }),
      })

      const response = await agentsmithWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support batch generation action', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': 'test-webhook-secret',
        },
        body: JSON.stringify({
          workflowId: 'workflow-123',
          executionId: 'exec-456',
          action: 'generate-batch',
          params: {
            prompt: 'Test image',
            count: 3,
          },
        }),
      })

      const response = await agentsmithWebhook(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should send callback to AgentSmith after completion', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ received: true }),
      })

      await agentSmithClient.sendCallback({
        workflowId: 'workflow-123',
        executionId: 'exec-456',
        status: 'completed',
        result: {
          outputs: {
            imageUrl: 'https://example.com/image.png',
          },
        },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/webhooks/krya'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Webhook-Secret': 'test-webhook-secret',
          }),
        })
      )
    })

    it('should handle AgentSmith unavailable gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'))

      const isAvailable = await agentSmithClient.isAvailable()

      expect(isAvailable).toBe(false)
    })
  })

  describe('Service Authentication', () => {
    it('should require INTERNAL_API_KEY for internal endpoints', async () => {
      const request = new NextRequest('http://localhost:3100/api/internal/newsletter/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No API key header
        },
        body: JSON.stringify({
          type: 'image',
          prompt: 'Test',
        }),
      })

      const response = await newsletterInternal(request)

      expect(response.status).toBe(401)
    })

    it('should require WEBHOOK_SECRET for webhook endpoints', async () => {
      const request = new NextRequest('http://localhost:3100/api/webhooks/agentsmith', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No webhook secret header
        },
        body: JSON.stringify({
          workflowId: 'test',
          action: 'generate-image',
        }),
      })

      const response = await agentsmithWebhook(request)

      expect(response.status).toBe(401)
    })
  })

  describe('Service Health Checks', () => {
    it('should check all service availability', async () => {
      const voiceForge = new VoiceForgeClient()
      const whisperFlow = new WhisperFlowClient()
      const agentSmith = new AgentSmithClient()

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // VoiceForge
        .mockResolvedValueOnce({ ok: true }) // WhisperFlow
        .mockResolvedValueOnce({ ok: true }) // AgentSmith

      const [vfAvailable, wfAvailable, asAvailable] = await Promise.all([
        voiceForge.isAvailable(),
        whisperFlow.isAvailable(),
        agentSmith.isAvailable(),
      ])

      expect(vfAvailable).toBe(true)
      expect(wfAvailable).toBe(true)
      expect(asAvailable).toBe(true)
    })
  })
})
