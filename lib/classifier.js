import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function classifyTicket(summary, description) {
  const prompt = `
You are a QA triage assistant. Given this bug report, respond ONLY in valid JSON, no markdown, no extra text.

Title: ${summary}
Description: ${description || "N/A"}

Return JSON in this exact format:
{
  "severity": "Highest" | "High" | "Medium" | "Low" | "Lowest",
  "reasoning": "one sentence why",
  "repro_steps": "extracted or inferred repro steps, or 'Not clear from report' if too vague",
  "clarity": "clear" | "vague"
}
`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  const text = completion.choices[0].message.content
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}