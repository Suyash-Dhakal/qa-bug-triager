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
You are a senior QA engineer checking whether a NEW bug report is a duplicate of any EXISTING ticket.

## New ticket
"${newTicket.summary}" - ${newTicket.description || "N/A"}

## Existing tickets
${existingList}

## What counts as a duplicate
Two tickets are duplicates only if they describe the SAME underlying bug — same root cause and same observable behavior — even if worded differently.
- Same symptom but plausibly different root cause (e.g. different screen, different trigger) is NOT a duplicate.
- Different wording describing the same failure IS a duplicate.
- A more general or more specific version of the same bug counts as a duplicate.
- When genuinely unsure, prefer is_duplicate: false. A wrong merge hides a real bug, which is worse than a missed match.

## Confidence
- "high": clearly the same bug — matching behavior and cause.
- "medium": likely the same, but some details differ or are missing.
- "low": weak signal, mostly overlapping keywords.

## Rules
- duplicate_of MUST be an exact TICKET-ID from the existing list. Never invent an ID.
- Pick the single best match only.

## Output — return ONLY this JSON, no markdown, no extra text. Always include all keys.
{ "is_duplicate": boolean, "duplicate_of": "TICKET-ID or null", "confidence": "high" | "medium" | "low" | null }

If not a duplicate: { "is_duplicate": false, "duplicate_of": null, "confidence": null }
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