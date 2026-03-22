import { GoogleGenerativeAI } from '@google/generative-ai'

const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

export const getGeminiModel = () => {
  const genAI = getGeminiClient()
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 10,
      responseMimeType: 'application/json',
    },
  })
}
