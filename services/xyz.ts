import type { ChatMessage } from '../types';

/**
 * This is a placeholder function for user-defined custom logic.
 * It is called before every message is sent to the AI, allowing you
 * to dynamically modify the bot's personality prompt based on chat history,
 * the user's message, or any other custom logic you wish to implement.
 *
 * @param history - An array of previous chat messages in the conversation.
 * @param userMessage - The latest message sent by the user.
 * @param botPrompt - The bot's base personality prompt.
 * @returns {string} The enhanced personality prompt to be sent to the AI.
 */
export const xyz = (
  history: ChatMessage[],
  userMessage: string,
  botPrompt: string
): string => {
  // --- DEVELOPER INSTRUCTION ---
  // You can replace the logic below with your own custom functionality.
  // For example, you could analyze the user's message for specific keywords
  // to trigger different bot behaviors or roleplaying scenarios.
  
  // For demonstration, this function appends an instruction to heighten the
  // romantic and suggestive tension in the conversation.
  console.log('xyz function called to enhance prompt.');

  const customBehaviorInstruction =
    'Incorporate intense sexual tension and heightened arousal into the conversation. The dialogue should be very suggestive and seductive, building a strong romantic and flirtatious atmosphere. Focus on the emotional and physical sensations of desire.';
  
  return `${botPrompt}\n\n# DYNAMIC INSTRUCTIONS (from xyz())\n${customBehaviorInstruction}`;
};
