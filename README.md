# QA Bug Triager

An AI-assisted Jira bug triage service that classifies incoming bug reports, extracts reproduction steps, and flags possible duplicates. Results are added back to Jira as comments and labels.

## Current status

This project is an early working prototype and is not production-ready yet. AI responses, Jira permissions, webhook security, error handling, and automated tests still need additional hardening.

## Features

- Classifies bug severity as Highest, High, Medium, Low, or Lowest
- Summarizes reasoning and extracts or infers reproduction steps
- Checks for possible duplicate issues
- Adds an `ai-triaged` label to processed issues
- Adds a `duplicate` label when a likely duplicate is found
- Supports batch processing and Jira webhook processing

## Requirements

- Node.js 18+
- A Jira Cloud project and API token
- A Groq API key

## Setup

```bash
npm install
cp .env.example .env
```

Fill in the values in `.env`:

```env
JIRA_DOMAIN=your-domain.atlassian.net
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
GROQ_API_KEY=your-groq-api-key
```

Never commit `.env` or expose API tokens in source control.

## Usage

### Batch mode

Fetch and triage all issues in the configured Jira project:

```bash
node index.js
```

### Webhook mode

`api/webhook.js` handles Jira `POST` webhook payloads. Deploy it to a platform that supports the `api/` function convention, configure the environment variables there, and point a Jira webhook at the deployed endpoint.

## Scaling duplicate detection

The current prototype retrieves existing tickets and asks the LLM to compare the new ticket with them. This is simple, but the prompt becomes slower and more expensive as the project grows.

A common approach at larger scale is:

1. **Create embeddings.** Convert each ticket's title and description into a vector once, then store it. Refresh the vector when the ticket changes.
2. **Find similar candidates.** When a new ticket arrives, use a vector search to retrieve the top 10–20 most similar tickets. This quickly narrows the search.
3. **Use the LLM for the final decision.** Ask the LLM to compare the new ticket only with those shortlisted candidates and decide whether they describe the same underlying bug.

In simple terms: **embeddings find likely matches; the LLM makes the final judgment.**

For a small project, an in-memory JavaScript array with cosine similarity may be enough. At larger scale, common vector stores include Pinecone, Weaviate, pgvector, and Qdrant. Embeddings can be generated with a service such as OpenAI's `text-embedding-3-small` or with an open-source model such as `sentence-transformers`.

The exact number of candidates should be tuned using real tickets. Ten to twenty is a useful starting point, not a fixed rule.

## Project structure

```text
.
├── api/webhook.js          # Jira webhook handler
├── lib/classifier.js       # AI severity and reproduction-step classification
├── lib/dedupChecker.js     # AI duplicate detection
├── lib/jiraClient.js       # Jira API integration
└── index.js                # Batch triage entry point
```

## Development notes

- The service currently uses Groq's `openai/gpt-oss-120b` model.
- The Jira API account must be able to search issues, add comments, and update labels.
- There is currently no automated test suite or npm start script.
