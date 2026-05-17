import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getAI() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    // Check if the key is empty, the placeholder, or the literal string "undefined"
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "" || apiKey === "undefined") {
      return null;
    }
    if (!genAI) {
      genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
  } catch (error) {
    console.warn("AI initialization failed (probably missing API key):", error);
    return null;
  }
}

export async function getWorkoutAdvice(recentWorkouts: any[]) {
  try {
    const ai = getAI();
    if (!ai) {
      return "Continuă să tragi tare! Progresul vine cu perseverență și disciplină.";
    }
    
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    // ... rest of logic
    
    const prompt = `Ești un antrenor personal expert. Analizează aceste ultime antrenamente: ${JSON.stringify(recentWorkouts)}. 
    Oferă un sfat scurt și motivant (maxim 2 propoziții) în limba română pentru următorul antrenament.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Continuă să tragi tare! Progresul vine cu perseverență și disciplină.";
  }
}
