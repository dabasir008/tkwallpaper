/**
 * 文件上传到 R2 API
 * POST form-data: file=图片文件
 * 返回 R2 公开 URL
 */

import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = "https://4abbe2c70aaa6ef87964494d6c726ae2.r2.cloudflarestorage.com";
const R2_BUCKET = "tkwallpaper";
const R2_PUBLIC = "https://pub-47bcb2d7ff1d4d90b554d3cc5a254b57.r2.dev";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const config = { api: { bodyParser: false } };

const contentTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function parseMultipart(buffer, boundary) {
  const parts = [];
  const str = buffer.toString("binary");
  const sections = str.split(`--${boundary}`);
  for (const section of sections) {
    if (!section.includes("Content-Disposition")) continue;
    const headerEnd = section.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;
    const header = section.slice(0, headerEnd);
    let body = section.slice(headerEnd + 4);
    if (body.endsWith("\r\n")) body = body.slice(0, -2);
    const nameMatch = header.match(/name="([^"]+)"/);
    const filenameMatch = header.match(/filename="([^"]+)"/);
    const contentTypeMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);
    parts.push({
      name: nameMatch?.[1] || "",
      filename: filenameMatch?.[1] || "",
      contentType: contentTypeMatch?.[1]?.trim().toLowerCase() || "",
      data: Buffer.from(body, "binary"),
    });
  }
  return parts;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) return res.status(500).json({ error: "R2 env vars are not configured" });

  try {
    const contentType = req.headers["content-type"] || "";
    const boundary = contentType.split("boundary=")[1]?.replace(/^"|"$/g, "");
    if (!boundary) return res.status(400).json({ error: "Need multipart upload" });

    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) return res.status(413).json({ error: "File is too large" });
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const parts = parseMultipart(buffer, boundary);

    const filePart = parts.find(p => p.name === "file" && p.filename);
    if (!filePart) return res.status(400).json({ error: "No file found" });

    const ext = (filePart.filename.split(".").pop() || "jpg").toLowerCase();
    const contentType = contentTypes[ext];
    if (!contentType) return res.status(400).json({ error: "Unsupported file type" });
    const key = `uploads/${crypto.randomBytes(16).toString("hex")}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: filePart.data,
      ContentType: contentType,
      CacheControl: "public, max-age=2592000",
    }));

    const url = `${R2_PUBLIC}/${key}`;
    console.log("Uploaded:", url);
    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
