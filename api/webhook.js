import { fetchAllTickets, addComment, addLabel } from "../lib/jiraClient.js";
import { classifyTicket } from "../lib/classifier.js";
import { checkDuplicate } from "../lib/dedupChecker.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = req.body;

    // Jira sends the full issue object under "issue"
    const issue = payload.issue;
    if (!issue) {
      return res.status(400).json({ error: "No issue data in payload" });
    }

    const ticketId = issue.id;
    const ticketKey = issue.key;
    const summary = issue.fields.summary;
    const description =
      issue.fields.description?.content?.[0]?.content?.[0]?.text || "";

    console.log(`Webhook triggered for ${ticketKey}: ${summary}`);

    // 1. Classify the new ticket
    const classification = await classifyTicket(summary, description);

    // 2. Fetch existing tickets to check for duplicates
    const allTickets = await fetchAllTickets();
    const otherTickets = allTickets.filter((t) => t.id !== ticketId);

    const dupCheck = await checkDuplicate(
      { summary, description },
      otherTickets
    );

    // 3. Build comment
    let commentText = `🤖 AI Triage:\nSeverity: ${classification.severity}\nReasoning: ${classification.reasoning}\nRepro Steps: ${classification.repro_steps}`;

    if (dupCheck.is_duplicate) {
      commentText += `\n⚠️ Possible duplicate of ${dupCheck.duplicate_of} (confidence: ${dupCheck.confidence})`;
      await addLabel(ticketId, "duplicate");
    }

    // 4. Write back to Jira
    await addComment(ticketId, commentText);
    await addLabel(ticketId, "ai-triaged");

    console.log(`✅ Processed ${ticketKey}`);
    return res.status(200).json({ status: "processed", ticket: ticketKey });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}