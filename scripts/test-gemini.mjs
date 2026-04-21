import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in .env");
    return;
  }
  console.log(`Using Key: ${apiKey.slice(0, 10)}...`);

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log("Testing gemini-1.5-flash-latest...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("Say hello world");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("1.5-flash-latest Error:", err.message);
  }

  try {
    console.log("Testing gemini-2.0-flash-exp...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent("Say hello world");
    console.log("Response:", result.response.text());
  } catch (err) {
    console.error("2.0-flash-exp Error:", err.message);
  }
}

testGemini();
