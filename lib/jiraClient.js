import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const baseURL = `https://${process.env.JIRA_DOMAIN}/rest/api/3`;
const auth = {
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN,
};

export async function fetchAllTickets() {
  const res = await axios.get(`${baseURL}/search/jql`, {
    auth,
    headers: { Accept: "application/json" },
    params: {
      jql: `project=${process.env.JIRA_PROJECT_KEY}`,
      fields: "summary,description,priority,status,labels",
    },
  });
  return res.data.issues;
}

export async function addComment(issueId, text) {
  return axios.post(
    `${baseURL}/issue/${issueId}/comment`,
    {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text }],
          },
        ],
      },
    },
    { auth, headers: { "Content-Type": "application/json" } }
  );
}

export async function addLabel(issueId, label) {
  return axios.put(
    `${baseURL}/issue/${issueId}`,
    { update: { labels: [{ add: label }] } },
    { auth, headers: { "Content-Type": "application/json" } }
  );
}