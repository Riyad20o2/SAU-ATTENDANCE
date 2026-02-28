import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled or mocked.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateClassSummary = async (className: string, topic: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return `Welcome to ${className}. Today's topic is ${topic}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, exciting, 2-sentence introduction for a university class titled "${className}" covering the topic "${topic}". Keep it professional yet engaging for students.`,
    });
    return response.text || `Welcome to ${className}. Today we cover ${topic}.`;
  } catch (error) {
    console.error("Error generating summary:", error);
    return `Welcome to ${className}. Today's topic is ${topic}.`;
  }
};

export const generateStudentMotivation = async (studentName: string, topic: string): Promise<string> => {
  const ai = getAiClient();
  // Generic fallback if no API
  if (!ai) return "Great job showing up! Success is built one class at a time.";

  try {
    // Modified prompt to be universal and ignore specific topic
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a very short (1 sentence) universal motivational message for a student named ${studentName} who just signed into class. 
      Do NOT mention the specific subject or topic. 
      Focus on general themes like consistency, potential, or showing up. 
      Make it encouraging, punchy, and perhaps slightly witty.`,
    });
    return response.text || "Success! Your attendance has been recorded.";
  } catch (error) {
    console.error("Error generating motivation:", error);
    return "Success! Your attendance has been recorded.";
  }
};