// Supabase Edge Function: trigger-broadcast
//
// Called from the app when an admin clicks "Send Update to All Members".
// Edge Functions can't open raw SMTP connections (HTTPS only), so this
// function doesn't send mail itself — it hands the subject/message to the
// GitHub Actions workflow in the employees-task-management repo, which has a
// real Node environment and does the actual sending over Gmail SMTP.
//
// One-time setup (done from the Supabase dashboard, not from here):
//   1. Paste this file's contents into Edge Functions -> trigger-broadcast.
//   2. Add a secret named GITHUB_PAT: a GitHub fine-grained personal access
//      token scoped only to the dcjainrealestate/employees-task-management
//      repo, with "Contents: read and write" permission (that's the scope
//      GitHub requires for dispatching a repository_dispatch event).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: { subject?: string; message?: string; senderName?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const subject = (payload.subject || "").trim();
  const message = (payload.message || "").trim();
  const senderName = (payload.senderName || "Admin").trim();
  if (!subject || !message) return json({ error: "subject and message are required" }, 400);

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
      body: JSON.stringify({
        event_type: "send-broadcast",
        client_payload: { subject, message, senderName },
      }),
    },
  );

  if (!ghRes.ok) {
    const detail = await ghRes.text();
    return json({ error: "GitHub dispatch failed", detail }, 502);
  }

  return json({ ok: true });
});
