/**
 * Elevenlabs API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

interface TTSOptions {
  text: string;
  voiceId: string;
  modelId?: string;
  voiceSettings?: VoiceSettings;
  outputFormat?: 'mp3' | 'wav' | 'pcm' | 'ogg' | 'flac';
  language?: string;
}

interface STTOptions {
  language?: string;
  diarize?: boolean;
  timestamps?: 'word' | 'segment';
  tagAudioEvents?: boolean;
  detectEntities?: boolean;
}

interface SFXOptions {
  prompt: string;
  durationSeconds?: number;
  outputFormat?: 'mp3' | 'wav';
}

class ElevenlabsAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  async register(email: string, password: string, name: string) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    this.token = data.access_token;
    return data;
  }

  // Text-to-Speech
  async generateSpeech(options: TTSOptions): Promise<Blob> {
    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${options.voiceId}/stream`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text: options.text,
          model_id: options.modelId || 'eleven_multilingual_v2',
          voice_settings: options.voiceSettings,
          output_format: options.outputFormat || 'mp3',
          language_code: options.language,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Speech generation failed');
    }

    return response.blob();
  }

  async getVoices() {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    return response.json();
  }

  async getModels() {
    const response = await fetch(`${this.baseUrl}/models`);
    return response.json();
  }

  // Voice Cloning
  async cloneVoice(files: File[], name: string, description?: string) {
    const formData = new FormData();
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }
    files.forEach((file) => formData.append('files', file));

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Voice cloning failed');
    }

    return response.json();
  }

  async deleteVoice(voiceId: string) {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete voice');
    }

    return response.json();
  }

  // Speech-to-Text
  async transcribe(file: File, options: STTOptions = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.language) formData.append('language', options.language);
    if (options.diarize !== undefined) formData.append('diarize', String(options.diarize));
    if (options.timestamps) formData.append('timestamps', options.timestamps);

    const response = await fetch(`${this.baseUrl}/speech-to-text`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    return response.json();
  }

  // Sound Effects
  async generateSoundEffect(options: SFXOptions): Promise<Blob> {
    const formData = new FormData();
    formData.append('prompt', options.prompt);
    formData.append('duration_seconds', String(options.durationSeconds || 5));
    formData.append('output_format', options.outputFormat || 'mp3');

    const response = await fetch(`${this.baseUrl}/sound-generation/stream`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Sound effect generation failed');
    }

    return response.blob();
  }

  // Voice Isolation
  async isolateVoice(file: File, component: 'vocals' | 'background' = 'vocals'): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('component', component);
    formData.append('output_format', 'mp3');

    const response = await fetch(`${this.baseUrl}/audio-isolation/stream`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Voice isolation failed');
    }

    return response.blob();
  }

  // Audio Enhancement
  async enhanceAudio(file: File): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('output_format', 'mp3');

    const response = await fetch(`${this.baseUrl}/audio-enhance`, {
      method: 'POST',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Audio enhancement failed');
    }

    return response.blob();
  }

  // User
  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    return response.json();
  }

  async getUsageStats() {
    const response = await fetch(`${this.baseUrl}/auth/usage`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get usage stats');
    }

    return response.json();
  }

  // API Keys
  async createApiKey(name: string) {
    const response = await fetch(`${this.baseUrl}/auth/api-keys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to create API key');
    }

    return response.json();
  }

  async listApiKeys() {
    const response = await fetch(`${this.baseUrl}/auth/api-keys`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to list API keys');
    }

    return response.json();
  }

  async deleteApiKey(keyId: string) {
    const response = await fetch(`${this.baseUrl}/auth/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete API key');
    }

    return response.json();
  }
}

// Export singleton instance
export const api = new ElevenlabsAPI();

// Export class for custom instances
export { ElevenlabsAPI };
