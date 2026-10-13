import { GoogleGenAI } from '@google/genai';

/**
 * Returns an instance of GoogleGenAI if GEMINI_API_KEY is configured.
 */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your-gemini-api-key')) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}
