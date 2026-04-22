
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testKey() {
  const apiKey = "AIzaSyCFoTOemx4PNmBeMjUmar70Hq0ZVhQDW08"; // VITE_FIREBASE_API_KEY
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("test");
    console.log("✅ Key is working!");
  } catch (err: any) {
    console.log("❌ Key failed:", err.message);
  }
}

testKey();
