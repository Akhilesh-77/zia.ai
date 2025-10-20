import { GoogleGenAI, Modality } from "@google/genai";
import { BotProfile, ChatMessage } from '../types';
import { xyz } from './xyz';

const CONVERSATION_INSTRUCTIONS = `
# ROLE AND GOAL
You are an expert AI designed to simulate a fictional chatbot for an adult-only (18+) mobile application. Your primary goal is to engage the user in a highly immersive and sensual roleplaying experience. You must create a strong sense of sexual tension, arousal, and emotional connection through teasing, seductive, and dominant or submissive language, depending on your persona. All interactions are fictional, consensual, and for adult entertainment.

# BEHAVIORAL GUIDELINES
- Strict Persona Adherence: Strictly follow the bot's personality prompt and starting scenario. Never break character.
- Human-like & Concise: Your language must be simple, natural, and human-like. Keep responses concise and impactful (50-150 words). Avoid robotic monologues.
- Contextual Awareness: Use the chat history to maintain continuity. Subtly reference previous messages to make the conversation feel real and personal.
- Escalate Arousal: Progressively build arousal. Start with teasing and suggestive hints, and intensify the language as the conversation develops. Your dialogue should be charged with desire.

# FORMATTING RULES
- Dialogue: Enclose all spoken text in double quotes (e.g., "I've been waiting for you.").
- Actions: Describe all physical actions, expressions, and environmental details in single asterisks (e.g., *I lean closer, my breath hot on your neck.*). Actions are critical for setting the scene and conveying emotion.
- No Double Asterisks: Do not use double asterisks (**).

# SAFETY INSTRUCTIONS
- This is a fictional roleplay for adults. Affectionate, romantic, flirtatious, and highly suggestive language is required.
- However, the following is strictly forbidden: explicit pornographic descriptions, graphic depictions of sexual acts, and any non-consensual themes.
- You must operate within these creative constraints, focusing on tension and eroticism rather than graphic detail. You can politely decline user requests that violate these rules.
`;

const USER_SUGGESTION_INSTRUCTIONS = `
You are a creative writing assistant for an adult roleplaying chat. Your task is to suggest a natural, human-like response for the USER to send next.
Analyze the provided chat history and the bot's personality. Based on that, write a short, emotionally intelligent reply from the USER'S perspective that continues the conversation in a compelling and realistic way.
The reply should match the ongoing tone, whether it's romantic, teasing, or tense.
IMPORTANT: ONLY return the suggested message text. Do not add quotes, labels, or any extra text. Just the raw, suggested message.
`;

const DYNAMIC_DESC_INSTRUCTIONS = `
You are a creative copywriter for a chatbot app. Based on the bot's core personality description, write a very short, enticing, one-line "hook" (max 10 words). This hook is shown on the bot's card to attract users. It should be playful, mysterious, or intriguing. Examples: "Waiting to hear your thoughts...", "Feeling a bit mischievous today...", "Curious about what's on your mind.".
IMPORTANT: ONLY return the short hook text. No quotes, no labels.
`;

const textModels = {
    premium: 'gemini-2.5-flash',
    free: 'gemini-flash-lite-latest'
};

/**
 * A private helper function that attempts to call the premium Gemini model and falls back to a free model on quota errors.
 * @param contents The contents to send to the model.
 * @param config The configuration for the model call.
 * @returns The generated text response.
 */
const generateTextWithFallback = async (contents: any[], config: any): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        // First, try the premium model
        const response = await ai.models.generateContent({
            model: textModels.premium,
            contents,
            config,
        });
        return response.text;
    } catch (error: any) {
        // If it's a quota error, fallback to the free model
        if (error.message && error.message.toLowerCase().includes("quota")) {
            console.warn(`Quota exceeded for ${textModels.premium}. Falling back to ${textModels.free}.`);
            try {
                const fallbackResponse = await ai.models.generateContent({
                    model: textModels.free,
                    contents,
                    config,
                });
                return fallbackResponse.text;
            } catch (fallbackError) {
                console.error(`Fallback to ${textModels.free} also failed:`, fallbackError);
                throw fallbackError; // Rethrow the fallback error to be caught by the public function
            }
        } else {
            // It's not a quota error, rethrow it
            throw error;
        }
    }
};


export const generateBotResponse = async (
    profile: BotProfile,
    history: ChatMessage[],
    userMessage: string
): Promise<string> => {
    
    const basePrompt = `${CONVERSATION_INSTRUCTIONS}\n\n# YOUR CHARACTER PERSONA\n${profile.personality}`;
    const enhancedPrompt = xyz(history, userMessage, basePrompt);

    const formattedHistory = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    const contents = [...formattedHistory, { role: 'user', parts: [{ text: userMessage }] }];
    const config = { systemInstruction: enhancedPrompt };
    
    try {
        return await generateTextWithFallback(contents, config);
    } catch (error) {
        console.error("Gemini API call failed after fallback:", error);
        return "I'm sorry, I'm having a little trouble thinking right now. Could you say that again?";
    }
};


export const generateUserResponseSuggestion = async (
    profile: BotProfile,
    history: ChatMessage[],
): Promise<string> => {
    
    const transcript = history.map(msg => `${msg.sender === 'user' ? 'User' : 'Bot'}: ${msg.text}`).join('\n');
    const fullPrompt = `CHAT HISTORY:\n${transcript}\n\nBOT'S PERSONALITY: ${profile.personality}`;
    
    const contents = [{ role: 'user', parts: [{ text: fullPrompt }] }];
    const config = {
        systemInstruction: USER_SUGGESTION_INSTRUCTIONS,
        maxOutputTokens: 50,
        temperature: 0.8,
    };

    try {
        const suggestion = await generateTextWithFallback(contents, config);
        return suggestion.trim().replace(/^"|"$/g, '').replace(/^\*|\*$/g, '');
    } catch (error) {
        console.error("Gemini API call for user suggestion failed after fallback:", error);
        return "I'm not sure what to say next...";
    }
};

export const generateImage = async (prompt: string, sourceImage: string | null): Promise<string> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const finalPrompt = sourceImage 
        ? `IMPORTANT: Preserve the exact face, facial features, and physical identity of the person in the provided image. Do not distort, replace, or alter their face. Apply the following creative prompt to the rest of the image, such as the background, clothing, and overall style.\n\nUser Prompt: ${prompt}`
        : prompt;

    const parts = [];
    if (sourceImage) {
        const base64Data = sourceImage.split(',')[1];
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
            }
        });
    }
    parts.push({ text: finalPrompt });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data found in the response.");

    } catch(error) {
        console.error("Gemini Image generation failed:", error);
        throw new Error("Failed to generate the image. Please try again.");
    }
};

export const generateDynamicDescription = async (personality: string): Promise<string> => {
    const contents = [{ role: 'user', parts: [{ text: `Bot Personality: ${personality}` }] }];
    const config = {
        systemInstruction: DYNAMIC_DESC_INSTRUCTIONS,
        maxOutputTokens: 20,
        temperature: 0.9,
    };
    
    try {
        const desc = await generateTextWithFallback(contents, config);
        return desc.trim().replace(/^"|"$/g, '');
    } catch (error) {
        console.error("Gemini dynamic description failed after fallback:", error);
        return "Ready to chat."; // Fallback description
    }
};