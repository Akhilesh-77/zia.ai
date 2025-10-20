import { GoogleGenAI, Content, Part, Modality } from "@google/genai";
import { ChatMessage, AIModelOption } from "../types";

const GEMINI_API_KEY = process.env.API_KEY;
// Conditionally initialize to prevent crashes if the key is missing. The App component will show an error screen.
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- Model Mapping ---
const modelMap: Record<Exclude<AIModelOption, 'gemini'>, string> = {
    zia: 'deepseek/deepseek-chat', 
    deepseek: 'deepseek/deepseek-chat-v3.1:free',
    qwen: 'qwen/qwen3-coder:free',
};

// Helper to convert base64 to a Part for multimodal input
const fileToGenerativePart = (base64Data: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType
    },
  };
};

const callOpenRouter = async (model: string, systemPrompt: string, history: ChatMessage[]) => {
    const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({
            role: msg.sender === 'bot' ? 'assistant' : 'user',
            content: msg.text
        }))
    ];

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000', // Replace with your site URL
            'X-Title': 'Zia.ai', // Replace with your site name
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenRouter API error: ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};

const callGemini = async (systemPrompt: string, history: ChatMessage[]) => {
    if (!ai) {
        throw new Error("Gemini API key is not configured. Cannot use Gemini fallback.");
    }
    const model = 'gemini-flash-lite-latest'; // Free model for fallback
    const contents: Content[] = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    
    const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction: systemPrompt },
    });
    return response.text;
};

// Generic Text Generation with Fallback
async function generateTextWithFallback(
    promptGenerator: () => string,
    history: ChatMessage[],
    selectedAI: AIModelOption
): Promise<string> {
    const systemPrompt = promptGenerator();

    if (selectedAI !== 'gemini' && modelMap[selectedAI]) {
        try {
            console.log(`Attempting to generate text with OpenRouter model: ${selectedAI}`);
            return await callOpenRouter(modelMap[selectedAI], systemPrompt, history);
        } catch (error) {
            console.warn(`OpenRouter model '${selectedAI}' failed:`, error, "Falling back to Gemini.");
            // Fall through to Gemini if OpenRouter fails
        }
    }
    
    console.log("Generating text with Gemini.");
    try {
        return await callGemini(systemPrompt, history);
    } catch (geminiError) {
        console.error("Gemini fallback also failed:", geminiError);
        return "Sorry, I'm having trouble connecting to my AI services right now. Please try again later.";
    }
}

export const generateBotResponse = (
    history: ChatMessage[], 
    personality: string, 
    selectedAI: AIModelOption
) => generateTextWithFallback(() => personality, history, selectedAI);

export const generateUserResponseSuggestion = (
    history: ChatMessage[], 
    personality: string, 
    selectedAI: AIModelOption
) => generateTextWithFallback(
    () => `You are helping a user write a response in a chat. Based on the bot's personality and the last few messages, suggest a short, natural, human-like reply from the USER'S perspective. Bot's personality for context: "${personality}"`,
    history, 
    selectedAI
);


export async function generateDynamicDescription(personality: string): Promise<string> {
  if (!ai) {
    console.warn("Gemini API key not configured. Using fallback description.");
    return "I'm ready to chat."; // Fallback description
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following personality description, write a single, very short, intriguing, and dynamic sentence (less than 15 words) that this character might say or think. The sentence should hint at their personality without explicitly stating it. Examples: "Another soul to read.", "Ready for a little chaos?", "The stars whisper secrets to me.". Do not use quotation marks. Personality: "${personality}"`,
    });
    return response.text.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating dynamic description:", error);
    // Graceful fallback to static description if API fails
    return "I'm ready to chat.";
  }
}

export async function generateImage(prompt: string, sourceImage: string | null): Promise<string> {
  if (!ai) {
    throw new Error("Gemini API key is not configured. Cannot generate image.");
  }

  const model = 'gemini-2.5-flash-image';
  const parts: Part[] = [{ text: `Instruction: Preserve the facial structure and identity of the person in the source image. ${prompt}` }];

  if (sourceImage) {
    const mimeType = sourceImage.match(/:(.*?);/)?.[1] || 'image/jpeg';
    parts.unshift(fileToGenerativePart(sourceImage, mimeType));
  }
  
  const response = await ai.models.generateContent({
    model,
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

  throw new Error("No image was generated. The prompt may have been blocked.");
}