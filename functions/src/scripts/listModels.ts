
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log("Listing models...");
    // The SDK doesn't have a direct listModels, we have to use the REST API or just try common ones
    const commonModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-1.5-flash-8b"];
    
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        await model.generateContent("test");
        console.log(`✅ ${modelName} is available`);
      } catch (e: any) {
        console.log(`❌ ${modelName} is NOT available: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
