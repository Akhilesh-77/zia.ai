
export interface BotProfile {
  id: string;
  name:string;
  description: string;
  photo: string; // base64 string
  personality: string;
  scenario: string;
}

export type MessageSender = 'user' | 'assistant';

export interface ChatMessage {
  id: number;
  text: string;
  sender: MessageSender;
}