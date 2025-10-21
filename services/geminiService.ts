import { GoogleGenAI, Content, Part, Modality } from "@google/genai";
import { ChatMessage, AIModelOption } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_IMG_API_URL = "https://openrouter.ai/api/v1/images/generations";

// --- Model Mapping & Fallbacks ---
const modelMap: Record<Exclude<AIModelOption, 'gemini'>, string> = {
    zia: 'deepseek/deepseek-chat', 
    deepseek: 'deepseek/deepseek-chat-v3.1:free',
    qwen: 'qwen/qwen2.5-vl-32b-instruct:free',
};

const FALLBACK_TEXT_MODELS = [
    'qwen/qwen2.5-vl-32b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'google/gemma-3-4b-it:free',
];


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

async function retry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown = new Error("All retry attempts failed without a specific error.");
    for (let i = 0; i < RETRY_LIMIT; i++) {
        try {
            const result = await fn();
            if (typeof result === 'string' && result.trim()) {
                return result;
            }
            if (typeof result !== 'string' && result) {
                 return result;
            }
            lastError = new Error("AI returned an empty or invalid response.");
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} resulted in an empty response. Retrying...`);
        } catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} of ${RETRY_LIMIT} failed with error:`, error, `Retrying...`);
        }
        if (i < RETRY_LIMIT - 1) { // Add delay before next retry
            await new Promise(res => setTimeout(res, 1500 * (i + 1)));
        }
    }
    console.error(`All ${RETRY_LIMIT} attempts failed.`);
    throw lastError;
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
            'HTTP-Referer': 'https://zia.ai/',
            'X-Title': 'Zia',
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
        })
    });

    if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody?.error?.message || response.statusText;
        throw new Error(`OpenRouter API error: ${errorMessage}`);
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
    let lastError: unknown = null;

    const modelsToTry: { type: 'gemini' | 'openrouter'; model: string }[] = [];
    
    // 1. Add the user's selected model first
    if (selectedAI === 'gemini') {
        modelsToTry.push({ type: 'gemini', model: 'gemini-flash-lite-latest' });
    } else if (modelMap[selectedAI]) {
        modelsToTry.push({ type: 'openrouter', model: modelMap[selectedAI] });
    }

    // 2. Add all fallback models
    FALLBACK_TEXT_MODELS.forEach(modelName => {
        // Avoid adding duplicates if already selected
        if (!modelsToTry.some(m => m.model === modelName)) {
            modelsToTry.push({ type: 'openrouter', model: modelName });
        }
    });

    // 3. Iterate and try each model
    for (const { type, model } of modelsToTry) {
        try {
            console.log(`Attempting to generate text with ${type} model: ${model}`);
            let result: string | null = null;
            if (type === 'gemini') {
                result = await callGemini(systemPrompt, history);
            } else {
                result = await callOpenRouter(model, systemPrompt, history);
            }
            
            if (result && result.trim()) {
                console.log(`Success with model: ${model}`);
                return result; // Return on first success
            }
        } catch (error) {
            lastError = error;
            console.warn(`${type} model '${model}' failed:`, error, "Proceeding to next model.");
            await new Promise(res => setTimeout(res, 500));
        }
    }
    
    // 4. If all models fail, throw the last captured error
    throw lastError || new Error("All primary and fallback AI services failed to generate a response.");
}

// --- Exposed Service Functions ---

export const generateBotResponse = async (
    history: ChatMessage[], 
    personality: string, 
    selectedAI: AIModelOption
): Promise<string> => {
    try {
        const generationFn = () => generateTextWithFallback(() => personality, history, selectedAI);
        return await retry(generationFn);
    } catch (error) {
        console.error("generateBotResponse failed ultimately:", error);
        return `Failed to fetch response: ${error instanceof Error ? error.message : String(error)}`;
    }
};


export const generateUserResponseSuggestion = async (
    history: ChatMessage[], 
    personality: string,
    selectedAI: AIModelOption
): Promise<string> => {
    const systemPrompt = `You are helping a user write a response in a chat. Based on the bot's personality and the last few messages, suggest a short, natural, human-like reply from the USER'S perspective. The response should be simple, realistic, and sound like something a real person would type in a chat. Avoid clichés or overly formal language. Bot's personality for context: "${personality}"`;

    try {
        const generationFn = () => generateTextWithFallback(() => systemPrompt, history, selectedAI);
        const result = await retry(generationFn);
        return result?.replace(/"/g, '')
    } catch (error) {
        console.error("generateUserResponseSuggestion failed ultimately:", error);
        return `Failed to get suggestion: ${error instanceof Error ? error.message : String(error)}`;
    }
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
  
  try {
    const generationFn = () => generateTextWithFallback(() => fullPrompt, [], selectedAI);
    return await retry(generationFn);
  } catch (error) {
     console.error("generateScenario failed ultimately:", error);
     return `Failed to generate scenario: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function generateImageWithOpenRouter(prompt: string): Promise<string> {
    console.log("Falling back to OpenRouter for image generation...");
    const response = await fetch(OPENROUTER_IMG_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://zia.ai/',
            'X-Title': 'Zia',
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
              throw new Error("Image generation is temporarily unavailable. Please try again or use text prompt only.");
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