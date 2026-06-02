const SB = process.env.SUPABASE_URL;
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, opts = {}) {
  const resp = await fetch(SB + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      apikey: opts.service ? SB_SERVICE_KEY : SB_ANON_KEY,
      Authorization: `Bearer ${opts.service ? SB_SERVICE_KEY : opts.token}`,
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
  const text = await resp.text();
  const data = text ? JSON.parse(text) : null;
  if (!resp.ok) throw new Error(data?.message || data?.error_description || data?.error || resp.statusText);
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SB || !SB_ANON_KEY || !SB_SERVICE_KEY) return res.status(500).json({ error: "Supabase env vars are not configured" });

  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Missing user token" });

  try {
    const user = await sbFetch("/auth/v1/user", { token });
    if (!user?.id) return res.status(401).json({ error: "Invalid user token" });

    const existing = await sbFetch(`/rest/v1/profiles?id=eq.${user.id}&select=points`, { service: true });
    if (Array.isArray(existing) && existing[0]) return res.status(200).json({ points: existing[0].points ?? 0 });

    const created = await sbFetch("/rest/v1/profiles", {
      method: "POST",
      service: true,
      body: JSON.stringify({ id: user.id, email: user.email, points: 10 }),
    });
    return res.status(200).json({ points: Array.isArray(created) && created[0] ? (created[0].points ?? 10) : 10 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
