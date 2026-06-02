/**
 * Lemon Squeezy Webhook Handler
 * Adds purchased points to a Supabase profile after signature verification.
 */

import crypto from "crypto";
import https from "https";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = { api: { bodyParser: false } };

async function supabaseQuery(path, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation",
      },
    };
    if (data) opts.headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(opts, (resp) => {
      let d = "";
      resp.on("data", (c) => (d += c));
      resp.on("end", () => {
        try {
          resolve(JSON.parse(d));
        } catch {
          resolve(d);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error("timeout")); });
    if (data) req.write(data);
    req.end();
  });
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function verifySignature(rawBody, signature, secret) {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = String(signature || "").trim();
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function creditsForProduct(productName) {
  if (productName?.includes("1200")) return 1200;
  if (productName?.includes("500")) return 500;
  if (productName?.includes("200")) return 200;
  if (productName?.includes("100")) return 100;
  return 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Supabase env vars are not configured" });

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-signature"];
  const secret = process.env.LEMONSQUEEZY_SECRET;
  if (!signature || !secret) return res.status(403).json({ error: "Missing signature config" });
  if (!verifySignature(rawBody, signature, secret)) return res.status(403).json({ error: "Invalid signature" });

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  try {
    const eventName = event?.meta?.event_name;
    if (eventName !== "order_created") return res.status(200).json({ received: true, skipped: true });

    const orderData = event?.data;
    const orderId = orderData?.id;
    const customerEmail = orderData?.attributes?.user_email;
    const productName = orderData?.attributes?.first_order_item?.product_name;
    const orderTotal = orderData?.attributes?.total;
    const credits = creditsForProduct(productName);
    if (!orderId || !customerEmail || credits <= 0) return res.status(200).json({ received: true, skipped: true });

    const purchaseDescription = `Purchase order ${orderId}: ${productName} ($${orderTotal / 100})`;
    const existingTxResp = await supabaseQuery(
      `/rest/v1/transactions?description=eq.${encodeURIComponent(purchaseDescription)}&select=id&limit=1`,
      "GET"
    );
    if (Array.isArray(existingTxResp) && existingTxResp.length > 0) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    const usersResp = await supabaseQuery(
      `/rest/v1/profiles?email=eq.${encodeURIComponent(customerEmail)}&select=id,points`,
      "GET"
    );
    const users = Array.isArray(usersResp) ? usersResp : [];

    if (users.length > 0) {
      const profile = users[0];
      const newPoints = (profile.points || 0) + credits;
      await supabaseQuery(`/rest/v1/profiles?id=eq.${profile.id}`, "PATCH", { points: newPoints });
      await supabaseQuery("/rest/v1/transactions", "POST", {
        user_id: profile.id,
        type: "purchase",
        amount: credits,
        description: purchaseDescription,
      });
      console.log("Credited", credits, "pts to", customerEmail, "now", newPoints);
    } else {
      console.log("No Supabase user found for email:", customerEmail);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
