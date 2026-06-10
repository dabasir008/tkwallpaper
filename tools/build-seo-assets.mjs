import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = "https://tkwallpaper.com";
const today = "2026-06-10";

const staticItems = JSON.parse(await readFile("data/static-wallpapers.json", "utf8"));
const liveItems = JSON.parse(await readFile("data/live-wallpapers.json", "utf8"));

async function writeTextFile(filePath, content) {
  try {
    await writeFile(filePath, content, "utf8");
  } catch (error) {
    if (error?.code !== "EBUSY") throw error;
    const existing = await readFile(filePath, "utf8").catch(() => null);
    if (existing !== content) throw error;
  }
}

const categoryCopy = {
  nature: "Calm forests, mountains, flowers, and dreamlike natural textures for a clean phone screen.",
  abstract: "Glass, chrome, cosmic, liquid, and geometric wallpapers with a premium visual feel.",
  minimal: "Dark OLED, soft gradients, clean shapes, and low-distraction wallpapers for daily use.",
  cyberpunk: "Neon rain, futuristic streets, electric glow, and sci-fi phone wallpaper styles.",
};

const aiTools = [
  {
    slug: "text-to-image-wallpaper-generator",
    title: "AI Text to Image Wallpaper Generator",
    h1: "AI Text to Image Wallpaper Generator",
    copy: "Turn a prompt into a vertical 9:16 phone wallpaper. Ideal for original abstract, OLED, anime-inspired, and cinematic wallpaper ideas.",
    cta: "/#custom-text-image",
    keywords: ["AI wallpaper generator", "text to image wallpaper", "prompt to phone wallpaper"],
  },
  {
    slug: "photo-to-cg",
    title: "Photo to CG Animation Style",
    h1: "Photo to CG Animation Style",
    copy: "Upload a portrait and transform it toward a polished CG animation look with high image restoration and style matching.",
    cta: "/#custom-cg-image",
    keywords: ["photo to CG", "real photo to CG animation", "AI portrait restoration"],
  },
  {
    slug: "image-to-video-wallpaper",
    title: "AI Image to Video Wallpaper",
    h1: "AI Image to Video Wallpaper",
    copy: "Animate a still image into a short live wallpaper with motion prompts, cinematic movement, and vertical phone-friendly output.",
    cta: "/#custom-image-video",
    keywords: ["image to video wallpaper", "AI live wallpaper", "animate image AI"],
  },
  {
    slug: "ai-video-face-swap",
    title: "AI Video Face Swap",
    h1: "AI Video Face Swap",
    copy: "Upload a source video and a face photo to generate a face-swapped video preview for creative wallpaper and short-form concepts.",
    cta: "/#custom-face-swap",
    keywords: ["AI video face swap", "face swap video AI", "AI face replacement"],
  },
  {
    slug: "ai-couple-photo",
    title: "AI Couple Photo Generator",
    h1: "AI Couple Photo Generator",
    copy: "Combine two person photos into a stylized AI couple photo sample for shareable portraits and wallpaper-style outputs.",
    cta: "/#custom-couple-photo",
    keywords: ["AI couple photo", "couple photo generator", "two person AI photo"],
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function absUrl(url) {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE}/${url.replace(/^\/+/, "")}`;
}

function pageShell({ title, description, canonical, body, image = "assets/generated/liquid-glass-halo.png", jsonLd }) {
  const ld = jsonLd || {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="TK Wallpaper">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(absUrl(image))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(absUrl(image))}">
  <title>${escapeHtml(title)}</title>
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BC18GDMTP1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "G-BC18GDMTP1");
  </script>
  <link rel="stylesheet" href="/style.css?v=20260610-ai5-5">
  <style>
    .seo-main { max-width: 1180px; margin: 0 auto; padding: 36px 16px 72px; }
    .seo-hero { padding: 28px 0 24px; }
    .seo-hero h1 { font-size: clamp(30px, 5vw, 56px); line-height: 1.02; margin-bottom: 14px; }
    .seo-hero p { max-width: 760px; color: #b8b8b8; font-size: 17px; line-height: 1.7; }
    .seo-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
    .seo-button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border-radius: 8px; background: #5b48f0; color: #fff; font-weight: 700; }
    .seo-link { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border-radius: 8px; border: 1px solid #333; color: #e8e8e8; }
    .seo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-top: 20px; }
    .seo-card { border: 1px solid #242424; border-radius: 8px; overflow: hidden; background: #151515; }
    .seo-card img, .seo-card video { width: 100%; aspect-ratio: 9 / 16; object-fit: cover; display: block; background: #080808; }
    .seo-card span { display: block; padding: 10px 12px; color: #f2f2f2; font-weight: 650; }
    .seo-section { margin-top: 34px; }
    .seo-section h2 { font-size: 24px; margin-bottom: 12px; }
    .seo-copy { color: #b8b8b8; line-height: 1.7; max-width: 820px; }
    .seo-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .seo-tags span { border: 1px solid #303030; border-radius: 999px; padding: 7px 11px; color: #cfcfcf; font-size: 13px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo" aria-label="TK Wallpaper home"><img src="/assets/tk-logo.svg" alt="TK Wallpaper"></a>
      <a class="header-buy-btn" href="/#custom">AI Custom</a>
    </div>
  </header>
  ${body}
  <footer class="footer"><p>TK Wallpaper &copy; 2026. Free wallpapers for personal use.</p></footer>
</body>
</html>
`;
}

function card(item) {
  const label = escapeHtml(item.label || item.categoryLabel || "Wallpaper");
  const src = item.src || item.videoUrl;
  const isVideo = Boolean(item.videoUrl);
  const media = isVideo
    ? `<video src="${escapeHtml(absUrl(item.videoUrl))}" muted loop playsinline preload="metadata"></video>`
    : `<img src="${escapeHtml(absUrl(src))}" alt="${label} phone wallpaper" loading="lazy">`;
  const href = item.section === "static" ? `/wallpapers/${slugify(item.id || item.label)}/` : "/#live";
  return `<a class="seo-card" href="${href}">${media}<span>${label}</span></a>`;
}

async function writePage(filePath, html) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeTextFile(filePath, html);
}

const urls = ["/"];

for (const [category, copy] of Object.entries(categoryCopy)) {
  const items = staticItems.filter(item => item.category === category).slice(0, 12);
  const url = `/static/${category}-wallpapers/`;
  urls.push(url);
  await writePage(`static/${category}-wallpapers/index.html`, pageShell({
    title: `${category[0].toUpperCase()}${category.slice(1)} Phone Wallpapers - TK Wallpaper`,
    description: `Browse free ${category} phone wallpapers. ${copy}`,
    canonical: `${SITE}${url}`,
    image: items[0]?.src,
    body: `<main class="seo-main">
      <section class="seo-hero">
        <h1>${category[0].toUpperCase()}${category.slice(1)} Phone Wallpapers</h1>
        <p>${escapeHtml(copy)} Download free static wallpapers or explore AI custom wallpaper tools.</p>
        <div class="seo-actions"><a class="seo-button" href="/#static">Browse All Wallpapers</a><a class="seo-link" href="/#custom">Create AI Wallpaper</a></div>
      </section>
      <section class="seo-section"><h2>Popular ${category} wallpapers</h2><div class="seo-grid">${items.map(card).join("")}</div></section>
    </main>`,
  }));
}

const liveCategories = ["anime", "animals", "mystic", "scenery", "sci-fi", "wealth"];
for (const category of liveCategories) {
  const items = liveItems.filter(item => item.category === category).slice(0, 12);
  if (!items.length) continue;
  const url = `/live/${category}-live-wallpapers/`;
  urls.push(url);
  const titleCategory = category.replace(/-/g, " ");
  await writePage(`live/${category}-live-wallpapers/index.html`, pageShell({
    title: `${titleCategory} Live Wallpapers - TK Wallpaper`,
    description: `Browse ${titleCategory} live wallpapers for phones. Preview vertical motion wallpapers and download with credits.`,
    canonical: `${SITE}${url}`,
    image: "assets/generated/rain-glass-neon-alley.png",
    body: `<main class="seo-main">
      <section class="seo-hero">
        <h1>${titleCategory} Live Wallpapers</h1>
        <p>Preview vertical motion wallpapers for phone screens. Built for short, vivid loops and easy mobile browsing.</p>
        <div class="seo-actions"><a class="seo-button" href="/#live">Browse Live Wallpapers</a><a class="seo-link" href="/#custom-image-video">Animate Your Image</a></div>
      </section>
      <section class="seo-section"><h2>Popular ${titleCategory} live wallpapers</h2><div class="seo-grid">${items.map(card).join("")}</div></section>
    </main>`,
  }));
}

for (const item of staticItems) {
  const slug = slugify(item.id || item.label);
  const url = `/wallpapers/${slug}/`;
  urls.push(url);
  const label = item.label || "AI Phone Wallpaper";
  await writePage(`wallpapers/${slug}/index.html`, pageShell({
    title: `${label} Phone Wallpaper - Free Download`,
    description: `Download ${label}, a free ${item.category} phone wallpaper from TK Wallpaper. AI-generated original artwork for personal use.`,
    canonical: `${SITE}${url}`,
    image: item.src,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      name: label,
      contentUrl: absUrl(item.src),
      license: `${SITE}/`,
      acquireLicensePage: `${SITE}/`,
      creator: { "@type": "Organization", name: "TK Wallpaper" },
    },
    body: `<main class="seo-main">
      <section class="seo-hero">
        <h1>${escapeHtml(label)} Phone Wallpaper</h1>
        <p>Free ${escapeHtml(item.category)} wallpaper for personal phone use. Save the image or browse related styles.</p>
        <div class="seo-actions"><a class="seo-button" href="${escapeHtml(absUrl(item.src))}">Open Wallpaper</a><a class="seo-link" href="/static/${escapeHtml(item.category)}-wallpapers/">More ${escapeHtml(item.category)} wallpapers</a></div>
      </section>
      <section class="seo-section"><div class="seo-grid"><article class="seo-card"><img src="${escapeHtml(absUrl(item.src))}" alt="${escapeHtml(label)} phone wallpaper"><span>${escapeHtml(label)}</span></article></div></section>
    </main>`,
  }));
}

for (const tool of aiTools) {
  const url = `/ai/${tool.slug}/`;
  urls.push(url);
  await writePage(`ai/${tool.slug}/index.html`, pageShell({
    title: `${tool.title} - TK Wallpaper`,
    description: tool.copy,
    canonical: `${SITE}${url}`,
    image: tool.slug === "photo-to-cg" ? "assets/ai-workflows/photo-to-cg-preview.webp" : "assets/generated/liquid-glass-halo.png",
    body: `<main class="seo-main">
      <section class="seo-hero">
        <h1>${escapeHtml(tool.h1)}</h1>
        <p>${escapeHtml(tool.copy)}</p>
        <div class="seo-actions"><a class="seo-button" href="${tool.cta}">Try This AI Tool</a><a class="seo-link" href="/#custom">View All AI Tools</a></div>
      </section>
      <section class="seo-section"><h2>Popular searches</h2><div class="seo-tags">${tool.keywords.map(k => `<span>${escapeHtml(k)}</span>`).join("")}</div></section>
    </main>`,
  }));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${SITE}${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${url === "/" ? "1.0" : "0.7"}</priority>
  </url>`).join("\n")}
</urlset>
`;
await writeTextFile("sitemap.xml", sitemap);

const keywordRows = [
  ["keyword", "target_url", "content_angle"],
  ["free phone wallpapers", "/", "Broad homepage intent"],
  ["aesthetic phone wallpapers", "/static/abstract-wallpapers/", "Visual style collection"],
  ["dark OLED wallpapers", "/static/minimal-wallpapers/", "Battery-friendly dark phone screens"],
  ["cyberpunk phone wallpaper", "/static/cyberpunk-wallpapers/", "Neon rain and sci-fi visuals"],
  ["nature phone wallpaper", "/static/nature-wallpapers/", "Calm natural imagery"],
  ["anime live wallpapers", "/live/anime-live-wallpapers/", "Motion wallpaper category"],
  ["AI wallpaper generator", "/ai/text-to-image-wallpaper-generator/", "Prompt to wallpaper tool"],
  ["photo to CG AI", "/ai/photo-to-cg/", "Portrait style transformation"],
  ["image to video wallpaper", "/ai/image-to-video-wallpaper/", "Still image animation"],
  ["AI couple photo generator", "/ai/ai-couple-photo/", "Two-person AI image tool"],
  ["AI video face swap", "/ai/ai-video-face-swap/", "Video face replacement tool"],
];
await mkdir("marketing", { recursive: true });
await writeTextFile("marketing/seo-keywords.csv", keywordRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n");

const socialPlan = `# TK Wallpaper Promotion Pack

## Posting cadence
- Pinterest: 20 pins per day for 14 days, mixing static wallpapers and AI tool pages.
- TikTok / Reels / Shorts: 3 short videos per day for the first 10 days.
- Reddit: 3 careful posts per week, focused on free resources or process, not hard selling.

## Short video captions
1. Free phone wallpapers that actually look premium. #wallpaper #phonewallpaper #aesthetic
2. Turn one image into a live wallpaper in seconds. #aiwallpaper #imagetovideo #livewallpaper
3. Dark OLED wallpaper ideas for a cleaner home screen. #oledwallpaper #minimalwallpaper
4. Photo to CG style test, before and after. #photoai #cgstyle #aitools
5. Neon rain live wallpaper for your lock screen. #cyberpunk #livewallpaper #lockscreen

## Pinterest pin templates
- {Wallpaper name} - free vertical phone wallpaper
- {Category} phone wallpaper for a clean lock screen
- AI-generated {style} wallpaper for iPhone and Android
- Live wallpaper idea: {motion style}

## User tasks
- Publish videos from outputs/promo-videos.
- Add a short manual note to each platform post so it does not look automated.
- Reply to early comments within 24 hours.
`;
await writeTextFile("marketing/promotion-pack.md", socialPlan);

console.log(`Generated ${urls.length} sitemap URLs and promotion files.`);
