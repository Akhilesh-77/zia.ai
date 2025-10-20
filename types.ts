export interface BotProfile {
  id: string;
  name:string;
  description: string;
  photo: string; // base64 string
  gif?: string; // base64 string
  personality: string;
  scenario: string;
  personaId?: string;
  chatBackground?: string; // base64 string for 9:16 aspect ratio image
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  personality: string;
  photo?: string; // base64 string
}

export type MessageSender = 'user' | 'assistant';

export interface ChatMessage {
  id:number;
  text: string;
  sender: MessageSender;
}