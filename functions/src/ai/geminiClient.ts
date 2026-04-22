import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let flashModel: GenerativeModel | null = null;
let proModel: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getFlashModel(): GenerativeModel {
  if (!flashModel) {
    flashModel = getGenAI().getGenerativeModel({
      model: "gemini-1.5-flash",
    }, { apiVersion: "v1beta" });
    
    // Configure separately to ensure compatibility
    flashModel.generationConfig = {
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    };
  }
  return flashModel;
}

export function getProModel(): GenerativeModel {
  if (!proModel) {
    proModel = getGenAI().getGenerativeModel({
      model: "gemini-1.5-pro",
    }, { apiVersion: "v1beta" });

    proModel.generationConfig = {
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    };
  }
  return proModel;
}
