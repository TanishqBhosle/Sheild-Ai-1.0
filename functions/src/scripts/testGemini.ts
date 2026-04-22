
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    console.log("Testing Gemini API...");
    const result = await model.generateContent("Say hello world");
    console.log("Response:", result.response.text());
    console.log("✅ Gemini API is working!");
  } catch (err) {
    console.error("❌ Gemini API failed:", err);
  }
}

testGemini();
