const SB = process.env.SUPABASE_URL;
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_PUBLIC = "https://pub-47bcb2d7ff1d4d90b554d3cc5a254b57.r2.dev/";

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

function isAllowedDownloadUrl(url) {
  if (typeof url !== "string") return false;
  if (url.startsWith("assets/live/")) return true;
  return url.startsWith(R2_PUBLIC);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SB || !SB_ANON_KEY || !SB_SERVICE_KEY) return res.status(500).json({ error: "Supabase env vars are not configured" });

  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Missing user token" });

  const { src, label = "wallpaper", points = 20 } = req.body || {};
  const cost = Number(points);
  if (!isAllowedDownloadUrl(src)) return res.status(400).json({ error: "Unsupported download source" });
  if (!Number.isFinite(cost) || cost <= 0 || cost > 1000) return res.status(400).json({ error: "Invalid points" });

  try {
    const user = await sbFetch("/auth/v1/user", { token });
    if (!user?.id) return res.status(401).json({ error: "Invalid user token" });

    const profiles = await sbFetch(`/rest/v1/profiles?id=eq.${user.id}&select=points`, { service: true });
    const currentPoints = Array.isArray(profiles) && profiles[0] ? (profiles[0].points ?? 0) : 0;
    if (currentPoints < cost) return res.status(402).json({ error: "Not enough points", points: currentPoints });

    const nextPoints = currentPoints - cost;
    await sbFetch(`/rest/v1/profiles?id=eq.${user.id}`, {
      method: "PATCH",
      service: true,
      body: JSON.stringify({ points: nextPoints }),
    });
    await sbFetch("/rest/v1/transactions", {
      method: "POST",
      service: true,
      body: JSON.stringify({
        user_id: user.id,
        type: "download",
        amount: -cost,
        description: `Download: ${label}`,
      }),
    });

    return res.status(200).json({ success: true, url: src, points: nextPoints });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
