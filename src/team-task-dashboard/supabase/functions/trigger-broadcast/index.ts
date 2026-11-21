// Supabase Edge Function: trigger-broadcast
//
// Relays every outbound email this app sends: the admin-composed "Send
// Update" broadcast, and the instant "you've been assigned a task" email.
// Edge Functions can't open raw SMTP connections (HTTPS only), so this
// function doesn't send mail itself — it hands the request to the GitHub
// Actions workflow in the employees-task-management repo, which has a real
// Node environment and does the actual sending over Gmail SMTP.
//
// One-time setup (done from the Supabase dashboard, not from here):
//   1. Paste this file's contents into Edge Functions -> trigger-broadcast.
//   2. Add a secret named GITHUB_PAT: a GitHub personal access token with
//      access to dispatch events on dcjainrealestate/employees-task-management
//      (a classic token with the "repo" scope is what's confirmed working;
//      fine-grained tokens have had reliability issues with this endpoint).
//   3. Deploy the function.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GITHUB_OWNER = "dcjainrealestate";
const GITHUB_REPO = "employees-task-management";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function dispatch(eventType: string, clientPayload: Record<string, unknown>) {
  const githubToken = Deno.env.get("GITHUB_PAT");
  if (!githubToken) return json({ error: "Server is missing its GITHUB_PAT secret" }, 500);

  const ghRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: eventType, client_payload: clientPayload }),
    },
  );

  if (!ghRes.ok) {
    const detail = await ghRes.text();
    return json({ error: "GitHub dispatch failed", detail }, 502);
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: {
    kind?: string;
    subject?: string;
    message?: string;
    senderName?: string;
    recipientEmail?: string;
    taskName?: string;
    dueDate?: string;
    assignedByName?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const kind = payload.kind || "broadcast";

  if (kind === "task-assigned") {
    const recipientEmail = (payload.recipientEmail || "").trim();
    const taskName = (payload.taskName || "").trim();
    const dueDate = (payload.dueDate || "").trim();
    const assignedByName = (payload.assignedByName || "A teammate").trim();
    if (!recipientEmail || !taskName) {
      return json({ error: "recipientEmail and taskName are required" }, 400);
    }
    return await dispatch("send-task-assigned", { recipientEmail, taskName, dueDate, assignedByName });
  }

  const subject = (payload.subject || "").trim();
  const message = (payload.message || "").trim();
  const senderName = (payload.senderName || "Admin").trim();
  const recipientEmail = (payload.recipientEmail || "").trim();
  if (!subject || !message) return json({ error: "subject and message are required" }, 400);

  return await dispatch("send-broadcast", { subject, message, senderName, recipientEmail });
});
