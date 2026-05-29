/**
 * Lemon Squeezy Webhook Handler
 * 支付成功后向 Supabase 用户账户加积分
 */

import crypto from "crypto";
import https from "https";

const SUPABASE_URL = "https://cctguqfxiihtjtpntdqb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdGd1cWZ4aWlodGp0cG50ZHFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0NzE4NywiZXhwIjoyMDk1NjIzMTg3fQ.DMsP_oCbErs7VEu49IXS5CgIGPzg8t70Rir6R1KZyTM";

async function supabaseQuery(path, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : undefined;
    const opts = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname,
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=representation",
      },
    };
    if (data) {
      opts.headers["Content-Length"] = Buffer.byteLength(data);
    }
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // 签名验证
  const signature = req.headers["x-signature"];
  const secret = process.env.LEMONSQUEEZY_SECRET;
  if (signature && secret) {
    const rawBody = JSON.stringify(req.body);
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(rawBody);
    if (hmac.digest("hex") !== signature) {
      return res.status(403).json({ error: "Invalid signature" });
    }
  }

  const event = req.body;
  try {
    const eventName = event?.meta?.event_name;
    if (eventName !== "order_created") {
      return res.status(200).json({ received: true, skipped: true });
    }

    const orderData = event?.data;
    const customerEmail = orderData?.attributes?.user_email;
    const productName = orderData?.attributes?.first_order_item?.product_name;
    const orderTotal = orderData?.attributes?.total;
    let credits = 0;
    if (productName?.includes("100")) credits = 100;
    else if (productName?.includes("200")) credits = 200;
    else if (productName?.includes("500")) credits = 500;
    else if (productName?.includes("1200")) credits = 1200;

    console.log("New order:", orderData.id, customerEmail, productName);

    // 根据邮箱查找 Supabase 用户
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
        description: `Purchase: ${productName} ($${orderTotal / 100})`,
      });
      console.log("Credited", credits, "pts to", customerEmail, "→ now", newPoints);
    } else {
      console.log("No Supabase user found for email:", customerEmail);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
