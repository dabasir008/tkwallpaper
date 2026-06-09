import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const DEFAULT_SOURCE_DIR = path.join(os.homedir(), "Desktop", "动态壁纸成品");
const SOURCE_DIR = process.env.LIVE_SOURCE_DIR || process.argv[2] || DEFAULT_SOURCE_DIR;
const MANIFEST_PATH = process.env.LIVE_MANIFEST_PATH || process.argv[3] || "data/live-wallpapers.json";
const DRY_RUN = process.env.LIVE_UPLOAD_DRY_RUN !== "0";
const LIMIT = Number(process.env.LIVE_UPLOAD_LIMIT || 0);
const TMP_DIR = process.env.LIVE_UPLOAD_TMP || path.join("tmp", "live-r2-upload");
const VIDEO_EXTS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

const categoryMap = new Map([
  ["动漫", { slug: "anime", label: "Anime" }],
  ["动物", { slug: "animals", label: "Animals" }],
  ["发财", { slug: "wealth", label: "Wealth" }],
  ["幸运", { slug: "lucky", label: "Lucky" }],
  ["搞笑", { slug: "funny", label: "Funny" }],
  ["炫酷", { slug: "cool", label: "Cool" }],
  ["玄学", { slug: "mystic", label: "Mystic" }],
  ["科幻", { slug: "sci-fi", label: "Sci-Fi" }],
  ["风景", { slug: "scenery", label: "Scenery" }],
  ["魔幻", { slug: "fantasy", label: "Fantasy" }],
]);

const contentTypes = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
};

async function loadEnv(file = ".env.local") {
  const text = await fs.readFile(file, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function safeSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function labelFromFile(fileName, fallbackIndex) {
  const base = path.parse(fileName).name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base || /^[a-f0-9]{16,}$/i.test(base) || /^\d+/.test(base)) {
    return `Live Wallpaper ${String(fallbackIndex + 1).padStart(3, "0")}`;
  }
  return base
    .split(" ")
    .slice(0, 5)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function fileHash(filePath) {
  const hash = crypto.createHash("sha256");
  const stream = fsSync.createReadStream(filePath);
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest("hex").slice(0, 16);
}

async function walkVideos(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const videos = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const category = categoryMap.get(entry.name) || { slug: safeSlug(entry.name), label: entry.name };
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile()) continue;
        const ext = path.extname(file.name).toLowerCase();
        if (!VIDEO_EXTS.has(ext)) continue;
        videos.push({ category, categorySource: entry.name, filePath: path.join(fullPath, file.name), fileName: file.name, ext });
      }
    }
  }
  videos.sort((a, b) => a.category.slug.localeCompare(b.category.slug) || a.fileName.localeCompare(b.fileName));
  return LIMIT > 0 ? videos.slice(0, LIMIT) : videos;
}

async function ensureMp4(video, hash) {
  if (video.ext === ".mp4") return { uploadPath: video.filePath, ext: ".mp4" };
  await fs.mkdir(TMP_DIR, { recursive: true });
  const outPath = path.join(TMP_DIR, `${video.category.slug}-${hash}.mp4`);
  if (fsSync.existsSync(outPath)) return { uploadPath: outPath, ext: ".mp4" };

  const result = spawnSync("ffmpeg", [
    "-y",
    "-i", video.filePath,
    "-vf", "scale='min(1080,iw)':-2",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "24",
    "-an",
    "-movflags", "+faststart",
    outPath,
  ], { stdio: "pipe" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${video.filePath}: ${result.stderr.toString("utf8").slice(0, 1000)}`);
  }
  return { uploadPath: outPath, ext: ".mp4" };
}

async function main() {
  await loadEnv();
  const endpoint = requireEnv("R2_ENDPOINT");
  const bucket = requireEnv("R2_BUCKET");
  const publicBase = requireEnv("R2_PUBLIC").replace(/\/$/, "");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const s3 = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  const videos = await walkVideos(SOURCE_DIR);
  console.log(`${DRY_RUN ? "Dry run" : "Uploading"} ${videos.length} live wallpapers from ${SOURCE_DIR}`);

  const existing = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8").catch(() => "[]"));
  const existingBySrc = new Map(existing.map(item => [item.src, item]));
  const uploadedItems = [];

  for (const [index, video] of videos.entries()) {
    const hash = await fileHash(video.filePath);
    const prepared = DRY_RUN ? { uploadPath: video.filePath, ext: video.ext === ".mp4" ? ".mp4" : video.ext } : await ensureMp4(video, hash);
    const key = `live/${video.category.slug}/${hash}-${safeSlug(path.parse(video.fileName).name) || "wallpaper"}.mp4`;
    const url = `${publicBase}/${key}`;
    const stat = await fs.stat(prepared.uploadPath);

    if (!DRY_RUN && !existingBySrc.has(url)) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fsSync.createReadStream(prepared.uploadPath),
        ContentType: contentTypes[prepared.ext] || "video/mp4",
        CacheControl: "public, max-age=31536000, immutable",
      }));
    }

    uploadedItems.push({
      id: `r2-live-${hash}`,
      src: url,
      videoUrl: url,
      category: video.category.slug,
      categoryLabel: video.category.label,
      label: labelFromFile(video.fileName, index),
      section: "live",
      free: false,
      points: 15,
      source: "r2-batch-upload",
      sourcePage: video.categorySource,
      license: "user-provided-or-ai-generated",
      review: "Provided by site owner for TK Wallpaper upload batch 2026-06-09",
      bytes: stat.size,
    });

    console.log(`${String(index + 1).padStart(3, "0")}/${videos.length} ${DRY_RUN ? "would upload" : "uploaded"} ${video.category.slug}/${video.fileName}`);
  }

  if (!DRY_RUN) {
    const keep = existing.filter(item => item.source !== "r2-batch-upload");
    await fs.writeFile(MANIFEST_PATH, `${JSON.stringify([...keep, ...uploadedItems], null, 2)}\n`, "utf8");
    console.log(`Updated ${MANIFEST_PATH} with ${uploadedItems.length} R2 live wallpapers`);
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
