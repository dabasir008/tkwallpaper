import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2] || "data/runninghub-generated-batch-5.json";
const outputDir = process.argv[3] || "assets/generated";
const manifestPath = process.argv[4] || "data/static-wallpapers.json";

await fs.mkdir(outputDir, { recursive: true });

const generated = JSON.parse(await fs.readFile(inputPath, "utf8"));
const existing = JSON.parse(await fs.readFile(manifestPath, "utf8").catch(() => "[]"));
const byId = new Map(existing.map(item => [item.id, item]));

for (const item of generated) {
  const results = item.result?.results || item.result?.data?.results || [];
  const first = results.map(result => result.url || result).find(Boolean);
  if (!first) continue;

  const ext = path.extname(new URL(first).pathname) || ".png";
  const fileName = `${item.slug}${ext}`;
  const localPath = path.join(outputDir, fileName).replaceAll("\\", "/");
  const resp = await fetch(first);
  if (!resp.ok) throw new Error(`Failed to download ${item.slug}: ${resp.status}`);
  await fs.writeFile(localPath, Buffer.from(await resp.arrayBuffer()));

  byId.set(`rh-${item.slug}`, {
    id: `rh-${item.slug}`,
    src: localPath,
    category: item.category || "abstract",
    label: item.label || item.slug,
    section: "static",
    free: true,
    source: "runninghub",
    sourcePage: `task:${item.taskId}`,
    license: "ai-generated-original",
  });
  console.log(`Imported ${item.slug}`);
}

await fs.writeFile(manifestPath, JSON.stringify([...byId.values()], null, 2) + "\n", "utf8");
console.log(`Updated ${manifestPath}`);
