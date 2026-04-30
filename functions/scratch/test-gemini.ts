import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  console.log("Using API Key:", apiKey.substring(0, 5) + "...");
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Listing models...");
    // The SDK doesn't have a direct listModels on genAI, usually it's via a client
    // But we can try to use the fetch API if needed.
    // For now, let's try a few common model names.
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-pro"];
    
    for (const modelName of models) {
      console.log(`Testing model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" });
      try {
        const result = await model.generateContent("Hi");
        const response = await result.response;
        console.log(`  Success with ${modelName}:`, response.text().substring(0, 20));
        break;
      } catch (e: any) {
        console.error(`  Failed with ${modelName}:`, e.message);
      }
    }
  } catch (error: any) {
    console.error("General Error:", error.message);
  }
}

test();
