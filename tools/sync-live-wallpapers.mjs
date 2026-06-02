import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const sourceDir = process.argv[2] || path.join(process.env.USERPROFILE || "", "Desktop", "动态壁纸");
const outputDir = path.join(process.cwd(), "assets", "live");
const manifestPath = path.join(process.cwd(), "data", "live-wallpapers.json");
const maxItems = Number(process.env.LIVE_WALLPAPER_LIMIT || 32);

const riskyNamePattern = /宝马|保时捷|奔驰|奥迪|路虎|迈巴赫|车标|BMW|Porsche|Mercedes|Audi|Darth|Vader|Spider|Halo|Blade|Runner|Death|Stranding|Mandalorian|Manladorian|单人|自拍|抽烟|人物|明星|logo/i;
const videoExts = new Set([".mp4", ".mov", ".m4v"]);
const categories = ["abstract", "cyberpunk", "minimal", "nature"];

function safeSlug(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function makeLabel(fileName, index) {
  const base = path.parse(fileName).name.replace(/[-_]+/g, " ").trim();
  if (/^\d+(\s*\(\d+\))?$/.test(base) || /^[a-f0-9]{16,}$/i.test(base) || /^mmexport/i.test(base)) {
    return `Live Wallpaper ${String(index + 1).padStart(2, "0")}`;
  }
  return base
    .split(/\s+/)
    .slice(0, 4)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

if (!existsSync(sourceDir)) {
  throw new Error(`Source folder not found: ${sourceDir}`);
}

mkdirSync(outputDir, { recursive: true });

const candidates = readdirSync(sourceDir, { withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => entry.name)
  .filter(name => videoExts.has(path.extname(name).toLowerCase()))
  .filter(name => !riskyNamePattern.test(name))
  .slice(0, maxItems);

const manifest = [];

for (const [index, fileName] of candidates.entries()) {
  const sourcePath = path.join(sourceDir, fileName);
  const ext = path.extname(fileName).toLowerCase();
  const slug = safeSlug(path.parse(fileName).name) || `live-${index + 1}`;
  const outputName = `${String(index + 1).padStart(2, "0")}-${slug}.mp4`;
  const outputPath = path.join(outputDir, outputName);

  if (ext === ".mp4") {
    copyFileSync(sourcePath, outputPath);
  } else {
    const result = spawnSync("ffmpeg", [
      "-y",
      "-i", sourcePath,
      "-vf", "scale='min(1080,iw)':-2",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "25",
      "-an",
      "-movflags", "+faststart",
      outputPath,
    ], { stdio: "pipe" });
    if (result.status !== 0) {
      throw new Error(`ffmpeg failed for ${fileName}: ${result.stderr.toString("utf8")}`);
    }
  }

  manifest.push({
    id: 101 + index,
    src: `assets/live/${outputName}`,
    videoUrl: `assets/live/${outputName}`,
    category: categories[index % categories.length],
    label: makeLabel(fileName, index),
    section: "live",
    free: false,
    points: 15,
  });
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Imported ${manifest.length} live wallpapers from ${sourceDir}`);
