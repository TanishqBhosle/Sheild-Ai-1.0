
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey!);

  const commonModels = ["gemini-pro", "gemini-1.0-pro"];
  
  for (const modelName of commonModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent("test");
      console.log(`✅ ${modelName} is available`);
    } catch (e: any) {
      console.log(`❌ ${modelName} is NOT available: ${e.message}`);
    }
  }
}

listModels();
