import { fetchAllTickets, addComment, addLabel } from "./lib/jiraClient.js";
import { classifyTicket } from "./lib/classifier.js";
import { checkDuplicate } from "./lib/dedupChecker.js";

async function run() {
  const tickets = await fetchAllTickets();
  const processed = [];

  for (const ticket of tickets) {
    const summary = ticket.fields.summary;
    const description =
      ticket.fields.description?.content?.[0]?.content?.[0]?.text || "";

    console.log(`Processing ${ticket.key}: ${summary}`);

    try {
      const classification = await classifyTicket(summary, description);
      const dupCheck = await checkDuplicate({ summary, description }, processed);

      let commentText = `🤖 AI Triage:\nSeverity: ${classification.severity}\nReasoning: ${classification.reasoning}\nRepro Steps: ${classification.repro_steps}`;

      if (dupCheck.is_duplicate) {
        commentText += `\n⚠️ Possible duplicate of ${dupCheck.duplicate_of} (confidence: ${dupCheck.confidence})`;
        await addLabel(ticket.id, "duplicate");
      }

      await addComment(ticket.id, commentText);
      await addLabel(ticket.id, "ai-triaged");

      processed.push(ticket);
      console.log(`✅ Done with ${ticket.key}\n`);
    } catch (err) {
      console.error(`❌ Failed on ${ticket.key}:`, err.message);
    }

    await new Promise((r) => setTimeout(r, 2000)); // small buffer, Groq is fast
  }
}

run().catch(console.error);