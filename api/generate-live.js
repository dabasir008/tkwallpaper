/**
 * Live wallpaper generation API.
 * POST submits an image URL to RunningHub; GET queries a RunningHub task.
 */

import crypto from "crypto";
import https from "https";

const RH_KEY = process.env.RUNNINGHUB_API_KEY;
const RH_UPLOAD = "https://www.runninghub.cn/task/openapi/upload";
const RH_RUN = "https://www.runninghub.cn/openapi/v2/run/ai-app/1934910866645000194";
const RH_QUERY = "https://www.runninghub.cn/openapi/v2/query";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_IMAGE_HOSTS = [
  "pub-47bcb2d7ff1d4d90b554d3cc5a254b57.r2.dev",
  "tkwallpaper.com",
  "www.tkwallpaper.com",
];

function allowedImageHosts() {
  const configured = (process.env.ALLOWED_IMAGE_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_IMAGE_HOSTS, ...configured]);
}

function assertAllowedImageUrl(imageUrl) {
  let parsed;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error("Invalid imageUrl");
  }
  if (parsed.protocol !== "https:" || !allowedImageHosts().has(parsed.hostname)) {
    throw new Error("imageUrl host is not allowed");
  }
  return parsed;
}

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = typeof body === "string" ? body : JSON.stringify(body);
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        ...headers,
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(opts, (resp) => {
      let d = "";
      resp.on("data", (c) => (d += c));
      resp.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(data);
    req.end();
  });
}

function httpsPostMultipart(url, apiKey, imageBuffer, fileName) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const boundary = "----FormBoundary" + crypto.randomBytes(16).toString("hex");
    const chunks = [];
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="apiKey"\r\n\r\n'));
    chunks.push(Buffer.from(apiKey + "\r\n"));
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
    chunks.push(Buffer.from("Content-Type: image/jpeg\r\n\r\n"));
    chunks.push(imageBuffer);
    chunks.push(Buffer.from(`\r\n--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="fileType"\r\n\r\n'));
    chunks.push(Buffer.from("image\r\n"));
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const multipartBody = Buffer.concat(chunks);

    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": multipartBody.length,
        "User-Agent": "Mozilla/5.0",
      },
    };
    const req = https.request(opts, (resp) => {
      let d = "";
      resp.on("data", (c) => (d += c));
      resp.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(multipartBody);
    req.end();
  });
}

function downloadImage(imageUrl, redirects = 0) {
  const parsed = assertAllowedImageUrl(imageUrl);
  return new Promise((resolve, reject) => {
    const req = https.get(parsed, { timeout: 30000 }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        if (redirects >= 3) return reject(new Error("Too many redirects"));
        const nextUrl = new URL(resp.headers.location, parsed).toString();
        resp.resume();
        return downloadImage(nextUrl, redirects + 1).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        resp.resume();
        return reject(new Error(`Image download failed: ${resp.statusCode}`));
      }
      const contentType = String(resp.headers["content-type"] || "");
      if (!contentType.startsWith("image/")) {
        resp.resume();
        return reject(new Error("imageUrl did not return an image"));
      }
      const chunks = [];
      let total = 0;
      resp.on("data", (chunk) => {
        total += chunk.length;
        if (total > MAX_IMAGE_BYTES) {
          req.destroy(new Error("Image is too large"));
          return;
        }
        chunks.push(chunk);
      });
      resp.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error("timeout")); });
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  if (!RH_KEY) return res.status(500).json({ error: "RUNNINGHUB_API_KEY is not configured" });

  if (req.method === "GET") {
    const taskId = req.query?.taskId;
    if (!taskId) return res.status(400).json({ error: "Missing taskId" });

    try {
      const result = await httpsPost(RH_QUERY, { taskId }, { Authorization: `Bearer ${RH_KEY}` });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "POST") {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: "Missing imageUrl" });
    let parsedImageUrl;
    try {
      parsedImageUrl = new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: "Invalid imageUrl" });
    }
    if (parsedImageUrl.protocol !== "https:" && parsedImageUrl.protocol !== "http:") {
      return res.status(400).json({ error: "Unsupported imageUrl protocol" });
    }

    try {
      const imgBuffer = await downloadImage(imageUrl);
      const uploadResp = await httpsPostMultipart(RH_UPLOAD, RH_KEY, imgBuffer, "wallpaper.jpg");
      if (uploadResp.code !== 0) return res.status(500).json({ error: "Upload failed", detail: uploadResp });

      const imgHash = uploadResp.data.fileName;
      const runResp = await httpsPost(RH_RUN, {
        nodeInfoList: [
          { nodeId: "131", fieldName: "image", fieldValue: imgHash },
          { nodeId: "177", fieldName: "value", fieldValue: "1" },
          { nodeId: "178", fieldName: "value", fieldValue: "2" },
        ],
        instanceType: "default",
        usePersonalQueue: "false",
      }, { Authorization: `Bearer ${RH_KEY}` });

      return res.status(200).json({
        success: true,
        taskId: runResp.taskId,
        status: runResp.status,
      });
    } catch (err) {
      console.error("Generate failed:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
