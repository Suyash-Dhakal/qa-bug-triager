import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function checkDuplicate(newTicket, existingTickets) {
  if (!existingTickets.length) {
    return { is_duplicate: false };
  }

  const existingList = existingTickets
    .map((t) => `ID: ${t.key} | Title: ${t.fields.summary}`)
    .join("\n");

  const prompt = `
You are checking if a new bug report is a duplicate of any existing ones.

New ticket: "${newTicket.summary}" - ${newTicket.description || ""}

Existing tickets:
${existingList}

If the new ticket describes the SAME underlying bug as one of the existing tickets, respond ONLY with valid JSON:
{ "is_duplicate": true, "duplicate_of": "TICKET-ID", "confidence": "high"|"medium"|"low" }

If not a duplicate of anything, respond:
{ "is_duplicate": false }

No markdown, no extra text.
`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
  });

  const text = completion.choices[0].message.content
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}