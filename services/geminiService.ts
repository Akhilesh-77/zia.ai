import { GoogleGenAI, Chat } from "@google/genai";
import { BotProfile } from '../types';

export const initChat = (profile: BotProfile): Chat => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // The system instruction is now the detailed personality from the bot's profile.
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: profile.personality,
    },
  });

  return chat;
};
