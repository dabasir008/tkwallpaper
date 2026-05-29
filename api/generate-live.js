/**
 * 动态壁纸生成 API
 * POST: 提交图片URL，返回 RunningHub 任务ID
 * GET:  查询任务状态，返回结果
 */

import crypto from "crypto";
import https from "https";
import http from "http";

const RH_KEY = "7b29e8ff03c24164b5da4a59aef8da85";
const RH_UPLOAD = "https://www.runninghub.cn/task/openapi/upload";
const RH_RUN = "https://www.runninghub.cn/openapi/v2/run/ai-app/1934910866645000194";
const RH_QUERY = "https://www.runninghub.cn/openapi/v2/query";

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
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
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
    const buf = imageBuffer;

    const chunks = [];
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="apiKey"\r\n\r\n'));
    chunks.push(Buffer.from(apiKey + "\r\n"));
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
    chunks.push(Buffer.from("Content-Type: image/jpeg\r\n\r\n"));
    chunks.push(buf);
    chunks.push(Buffer.from(`\r\n--${boundary}\r\n`));
    chunks.push(Buffer.from('Content-Disposition: form-data; name="fileType"\r\n\r\n'));
    chunks.push(Buffer.from("image\r\n"));
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(chunks);

    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
        "User-Agent": "Mozilla/5.0",
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error(d)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(body);
    req.end();
  });
}

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

export default async function handler(req, res) {
  // 处理 CORS 预检
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  // GET: 查询任务状态
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

  // POST: 提交生成任务
  if (req.method === "POST") {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: "Missing imageUrl" });

    try {
      // 1. 下载图片
      console.log("下载图片:", imageUrl);
      const imgBuffer = await downloadImage(imageUrl);

      // 2. 上传到 RunningHub
      console.log("上传到 RunningHub...");
      const uploadResp = await httpsPostMultipart(RH_UPLOAD, RH_KEY, imgBuffer, "wallpaper.jpg");
      if (uploadResp.code !== 0) {
        return res.status(500).json({ error: "Upload failed", detail: uploadResp });
      }
      const imgHash = uploadResp.data.fileName;
      console.log("上传成功:", imgHash);

      // 3. 提交 AI 任务
      console.log("提交 AI 任务...");
      const runResp = await httpsPost(RH_RUN, {
        nodeInfoList: [
          { nodeId: "131", fieldName: "image", fieldValue: imgHash },
          { nodeId: "177", fieldName: "value", fieldValue: "1" },
          { nodeId: "178", fieldName: "value", fieldValue: "2" },
        ],
        instanceType: "default",
        usePersonalQueue: "false",
      }, { Authorization: `Bearer ${RH_KEY}` });

      console.log("任务已提交:", runResp.taskId);

      return res.status(200).json({
        success: true,
        taskId: runResp.taskId,
        status: runResp.status,
      });
    } catch (err) {
      console.error("生成失败:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
