/**
 * Generic RunningHub workflow proxy for AI Custom tools.
 * POST submits a mode-specific job; GET queries a RunningHub task.
 */

import crypto from "crypto";
import https from "https";

const RH_KEY = process.env.RUNNINGHUB_API_KEY;
const RH_UPLOAD = "https://www.runninghub.cn/task/openapi/upload";
const RH_QUERY = "https://www.runninghub.cn/openapi/v2/query";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_ALLOWED_HOSTS = [
  "pub-47bcb2d7ff1d4d90b554d3cc5a254b57.r2.dev",
  "tkwallpaper.com",
  "www.tkwallpaper.com",
];

const workflowApps = {
  "text-image": "https://www.runninghub.cn/openapi/v2/run/ai-app/2046794551444119554",
  "cg-image": "https://www.runninghub.cn/openapi/v2/run/ai-app/1990709528691970050",
  "image-video": "https://www.runninghub.cn/openapi/v2/run/ai-app/2054369530843017217",
  "face-swap": "https://www.runninghub.cn/openapi/v2/run/ai-app/1988502514859425794",
  "couple-photo": "https://www.runninghub.cn/openapi/v2/run/ai-app/1977955515588300802",
};

function allowedHosts() {
  const configured = (process.env.ALLOWED_IMAGE_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...configured]);
}

function assertAllowedUrl(fileUrl) {
  let parsed;
  try {
    parsed = new URL(fileUrl);
  } catch {
    throw new Error("Invalid file URL");
  }
  if (parsed.protocol !== "https:" || !allowedHosts().has(parsed.hostname)) {
    throw new Error("File URL host is not allowed");
  }
  return parsed;
}

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
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
      let raw = "";
      resp.on("data", (chunk) => (raw += chunk));
      resp.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch { reject(new Error(raw)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(data);
    req.end();
  });
}

function downloadFile(fileUrl, redirects = 0) {
  const parsed = assertAllowedUrl(fileUrl);
  return new Promise((resolve, reject) => {
    const req = https.get(parsed, { timeout: 30000 }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        if (redirects >= 3) return reject(new Error("Too many redirects"));
        const nextUrl = new URL(resp.headers.location, parsed).toString();
        resp.resume();
        return downloadFile(nextUrl, redirects + 1).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        resp.resume();
        return reject(new Error(`File download failed: ${resp.statusCode}`));
      }
      const contentType = String(resp.headers["content-type"] || "").toLowerCase();
      if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
        resp.resume();
        return reject(new Error("File URL returned an unsupported type"));
      }
      const chunks = [];
      let total = 0;
      resp.on("data", (chunk) => {
        total += chunk.length;
        if (total > MAX_FILE_BYTES) {
          req.destroy(new Error("File is too large"));
          return;
        }
        chunks.push(chunk);
      });
      resp.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType }));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error("timeout")); });
  });
}

function httpsPostMultipart(url, apiKey, fileBuffer, fileName, fileType, contentType) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const boundary = "----FormBoundary" + crypto.randomBytes(16).toString("hex");
    const chunks = [];
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="apiKey"\r\n\r\n'));
    chunks.push(Buffer.from(apiKey + "\r\n"));
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
    chunks.push(Buffer.from(`Content-Type: ${contentType}\r\n\r\n`));
    chunks.push(fileBuffer);
    chunks.push(Buffer.from(`\r\n--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="fileType"\r\n\r\n'));
    chunks.push(Buffer.from(fileType + "\r\n"));
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
      let raw = "";
      resp.on("data", (chunk) => (raw += chunk));
      resp.on("end", () => {
        try { resolve(JSON.parse(raw)); } catch { reject(new Error(raw)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(multipartBody);
    req.end();
  });
}

function extFromContentType(contentType) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("mp4")) return "mp4";
  if (contentType.includes("quicktime")) return "mov";
  if (contentType.includes("webm")) return "webm";
  return "jpg";
}

async function uploadRunningHubFile(fileUrl) {
  if (!fileUrl) throw new Error("Missing file URL");
  const { buffer, contentType } = await downloadFile(fileUrl);
  const fileType = contentType.startsWith("video/") ? "video" : "image";
  const ext = extFromContentType(contentType);
  const uploadResp = await httpsPostMultipart(RH_UPLOAD, RH_KEY, buffer, `tk-workflow.${ext}`, fileType, contentType);
  if (uploadResp.code !== 0) throw new Error("RunningHub upload failed");
  const fileName = uploadResp.data?.fileName || uploadResp.data?.file_name;
  if (!fileName) throw new Error("RunningHub upload did not return a file name");
  return fileName;
}

async function buildNodeInfo(mode, body) {
  const prompt = String(body.prompt || "").trim();
  if (mode === "text-image") {
    if (!prompt) throw new Error("Missing prompt");
    return [
      { nodeId: "18", fieldName: "aspectRatio", fieldValue: body.aspectRatio || "9:16" },
      { nodeId: "18", fieldName: "prompt", fieldValue: prompt },
    ];
  }
  if (mode === "cg-image") {
    return [
      { nodeId: "107", fieldName: "image", fieldValue: await uploadRunningHubFile(body.imageUrl) },
    ];
  }
  if (mode === "image-video") {
    if (!prompt) throw new Error("Missing prompt");
    return [
      { nodeId: "98", fieldName: "image", fieldValue: await uploadRunningHubFile(body.imageUrl) },
      { nodeId: "226", fieldName: "prompt", fieldValue: prompt },
      { nodeId: "238", fieldName: "value", fieldValue: "25.000000000000004" },
      { nodeId: "234", fieldName: "value", fieldValue: "5" },
    ];
  }
  if (mode === "face-swap") {
    return [
      { nodeId: "270", fieldName: "image", fieldValue: await uploadRunningHubFile(body.faceUrl) },
      { nodeId: "272", fieldName: "video", fieldValue: await uploadRunningHubFile(body.videoUrl) },
      { nodeId: "288", fieldName: "value", fieldValue: "5" },
      { nodeId: "303", fieldName: "value", fieldValue: "832" },
    ];
  }
  if (mode === "couple-photo") {
    return [
      { nodeId: "4", fieldName: "image", fieldValue: await uploadRunningHubFile(body.imageUrl) },
      { nodeId: "38", fieldName: "image", fieldValue: await uploadRunningHubFile(body.imageUrl2) },
    ];
  }
  throw new Error("Unsupported workflow mode");
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
    const mode = String(req.body?.mode || "");
    if (!workflowApps[mode]) return res.status(400).json({ error: "Unsupported workflow mode" });
    try {
      const nodeInfoList = await buildNodeInfo(mode, req.body || {});
      const runResp = await httpsPost(workflowApps[mode], {
        nodeInfoList,
        instanceType: "default",
        usePersonalQueue: "false",
      }, { Authorization: `Bearer ${RH_KEY}` });
      return res.status(200).json({
        success: true,
        taskId: runResp.taskId || runResp.data?.taskId || runResp.data?.task_id,
        status: runResp.status || runResp.data?.status,
        raw: runResp,
      });
    } catch (err) {
      console.error("AI workflow failed:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
