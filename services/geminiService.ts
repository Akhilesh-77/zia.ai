import { GoogleGenAI, Content, Part, Modality } from "@google/genai";
import { ChatMessage, AIModelOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_IMG_API_URL = "https://openrouter.ai/api/v1/images/generations";

// --- Model Mapping ---
const modelMap: Record<Exclude<AIModelOption, 'gemini'>, string> = {
    zia: 'deepseek/deepseek-chat', 
    deepseek: 'deepseek/deepseek-chat-v3.1:free',
    qwen: 'qwen/qwen3-coder:free',
};

// --- Helper Functions ---

const fileToGenerativePart = (base64Data: string, mimeType: string): Part => {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType
    },
  };
};

const RETRY_LIMIT = 3;

async function retry<T>(fn: () => Promise<T>): Promise<T | null> {
    for (let i = 0; i < RETRY_LIMIT; i++) {
        try {
            const result = await fn();
            if (typeof result === 'string' && result.trim()) {
                return result;
            }
            if (typeof result !== 'string' && result) {
                 return result;
            }
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} resulted in an empty response. Retrying...`);
        } catch (error) {
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} failed with error:`, error, `Retrying...`);
        }
    }
    console.error(`All ${RETRY_LIMIT} attempts failed.`);
    return null;
}


// --- Core AI Call Logic ---

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
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Zia.ai.new',
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
    const model = 'gemini-flash-lite-latest';
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
        }
    }
    
    console.log("Generating text with Gemini.");
    try {
        return await callGemini(systemPrompt, history);
    } catch (geminiError) {
        console.error("Gemini fallback also failed:", geminiError);
        throw new Error("All primary AI services failed.");
    }
}

// --- Exposed Service Functions ---

export const generateBotResponse = (
    history: ChatMessage[], 
    personality: string, 
    selectedAI: AIModelOption
) => generateTextWithFallback(() => personality, history, selectedAI);

export const generateUserResponseSuggestion = async (
    history: ChatMessage[], 
    personality: string,
    selectedAI: AIModelOption
): Promise<string> => {
    const systemPrompt = `You are helping a user write a response in a chat. Based on the bot's personality and the last few messages, suggest a short, natural, human-like reply from the USER'S perspective. The response should be simple, realistic, and sound like something a real person would type in a chat. Avoid clichés or overly formal language. Bot's personality for context: "${personality}"`;

    const generationFn = () => generateTextWithFallback(() => systemPrompt, history, selectedAI);
    const result = await retry(generationFn);

    return result?.replace(/"/g, '') || "Hey cutie 😚 I’m thinking... give me a sec 💭";
};

export async function generateDynamicDescription(personality: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following personality description, write a single, very short, intriguing, and dynamic sentence (less than 15 words) that this character might say or think. The sentence should hint at their personality without explicitly stating it. Examples: "Another soul to read.", "Ready for a little chaos?", "The stars whisper secrets to me.". Do not use quotation marks. Personality: "${personality}"`,
    });
    return response.text.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating dynamic description:", error);
    return "I'm ready to chat.";
  }
}

export async function generateScenario(
    personaPersonality: string, 
    userPrompt: string,
    selectedAI: AIModelOption
): Promise<string> {
  const fullPrompt = `You are a creative writer tasked with starting a roleplay chat.
- The bot's personality is: "${personaPersonality}"
- The user has provided an optional theme/idea: "${userPrompt || 'None'}"

Based on this, write a simple, creative, and engaging opening message (a "scenario") from the bot's point of view. The message should set a scene or start a conversation. It must be written in a human-like, first-person style. Keep it concise (2-4 sentences). Do not use quotation marks for the whole message, but you can use them for dialogue within the message. For example, instead of "*I look at you and say "hi"*", it should be something like "I look over at you, a small smile playing on my lips. 'Hi there,' I say softly."`;

  const generationFn = () => generateTextWithFallback(() => fullPrompt, [], selectedAI);
  const result = await retry(generationFn);

  return result || "Hey there 👋! Let’s start something fun together!";
}

async function generateImageWithOpenRouter(prompt: string): Promise<string> {
    console.log("Falling back to OpenRouter for image generation...");
    const response = await fetch(OPENROUTER_IMG_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Zia.ai.new',
        },
        body: JSON.stringify({
            model: 'free',
            prompt: prompt,
            n: 1,
            response_format: 'b64_json',
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`OpenRouter Image Gen API error: ${response.statusText} - ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].b64_json) {
        return data.data[0].b64_json;
    }
    
    throw new Error("OpenRouter did not return a valid image.");
}


export async function generateImage(prompt: string, sourceImage: string | null): Promise<string> {
  try {
    const model = 'gemini-2.5-flash-image';
    const parts: Part[] = [{ text: prompt }];

    if (sourceImage) {
      parts[0].text = `Instruction: Preserve the facial structure and identity of the person in the source image. ${prompt}`;
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
  } catch (err) {
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('resource exhausted');

      if (isQuotaError) {
          console.warn("Gemini image generation failed due to quota, falling back to OpenRouter.", err);
          if (sourceImage) {
              throw new Error("Image editing is unavailable due to high demand. Please try again later with just a text prompt.");
          }
          const base64Data = await generateImageWithOpenRouter(prompt);
          return base64Data;
      } else {
          console.error("Gemini image generation failed for a non-quota reason:", err);
          if (err instanceof Error) throw err;
          throw new Error("An unknown error occurred during image generation.");
      }
  }
}