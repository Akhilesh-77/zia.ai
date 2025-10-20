
export type AIModelOption = 'gemini' | 'zia' | 'deepseek' | 'qwen';
export type VoicePreference = 'male' | 'female';

export interface BotProfile {
  id: string;
  name: string;
  description: string;
  personality: string;
  photo: string; // base64 data URL
  gif?: string | null; // base64 data URL
  scenario: string;
  chatBackground?: string | null; // base64 data URL
  personaId?: string | null;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  personality: string;
  photo?: string | null; // base64 data URL
}
