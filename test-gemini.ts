import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function main() {
  console.log("API key exists:", !!process.env.GEMINI_API_KEY);

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  console.log("Testing Gemini...");

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "Reply with exactly: GEMINI_OK",
  });

  console.log("RESULT:");
  console.log(response.text);
}

main().catch((error) => {
  console.error("GEMINI TEST FAILED:");
  console.error(error);
});