// ===== 杞婚噺 Supabase 瀹㈡埛绔紙涓嶄緷璧栧閮?SDK锛?=====
const SB = "https://cctguqfxiihtjtpntdqb.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdGd1cWZ4aWlodGp0cG50ZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDcxODcsImV4cCI6MjA5NTYyMzE4N30.C2SznOpOWW3JjB_ZIe6hB_yuHVQjkO4ye4ZZmHY2EWs";

let authAvailable = true;
let currentUser = null;
let userAccessToken = "";
let savedSession = null;

// 鎭㈠鏈湴 session
try {
  const saved = JSON.parse(localStorage.getItem("sb_session") || "null");
  if (saved && saved.token && saved.user) {
    savedSession = saved;
    userAccessToken = saved.token;
  }
} catch {}

function sbApi(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    apikey: SB_KEY,
    ...(opts.headers || {}),
  };
  if (userAccessToken && !headers["Authorization"]) headers["Authorization"] = `Bearer ${userAccessToken}`;
  if (!opts.skipKey && !headers["Authorization"]) headers["Authorization"] = `Bearer ${SB_KEY}`;

  return fetch(SB + path, { ...opts, headers }).then(async r => {
    const txt = await r.text();
    if (!txt) return null;
    try { return JSON.parse(txt); } catch { return txt; }
  });
}

async function loginUser(email, password) {
  const r = await sbApi("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipKey: true,
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
  });
  if (r.error || r.error_description) throw new Error(r.error_description || r.error || "Login failed");
  userAccessToken = r.access_token;
  const userR = await sbApi("/auth/v1/user", { skipKey: true, headers: { Authorization: `Bearer ${r.access_token}` } });
  currentUser = userR;
  localStorage.setItem("sb_session", JSON.stringify({ token: r.access_token, user: userR }));
  return currentUser;
}

async function restoreSavedSession() {
  if (!savedSession) return;
  try {
    const userR = await sbApi("/auth/v1/user", {
      skipKey: true,
      headers: { Authorization: `Bearer ${savedSession.token}` },
    });
    if (!userR || userR.error || !userR.id) throw new Error("Session expired");
    currentUser = userR;
    localStorage.setItem("sb_session", JSON.stringify({ token: savedSession.token, user: userR }));
    updateAuthUI(currentUser);
  } catch {
    logoutUser();
    updateAuthUI(null);
  }
}

async function signupUser(email, password) {
  return sbApi("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipKey: true,
    headers: { "Content-Type": "application/json", apikey: SB_KEY },
  });
}

function logoutUser() {
  currentUser = null;
  userAccessToken = "";
  localStorage.removeItem("sb_session");
}

async function fetchPoints() {
  if (!currentUser) return 0;
  try {
    return ensureUserProfile();
  } catch { return ensureUserProfile(); }
}

async function ensureUserProfile() {
  if (!currentUser) return 0;
  const resp = await fetch("/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAccessToken}`,
    },
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Profile request failed");
  return data.points ?? 0;
}

async function updatePointsToDB(newPoints) {
  userPoints = newPoints;
  updatePointsDisplay();
  if (!currentUser) return;
  try { await sbApi(`/rest/v1/profiles?id=eq.${currentUser.id}`, { method: "PATCH", body: JSON.stringify({ points: newPoints }), headers: { Prefer: "return=representation" } }); } catch {}
}

async function logTransaction(type, amount, desc) {
  if (!currentUser) return;
  try { await sbApi("/rest/v1/transactions", { method: "POST", body: JSON.stringify({ user_id: currentUser.id, type, amount, description: desc }) }); } catch {}
}

// ===== 澹佺焊鏁版嵁 =====
const staticWallpapers = [
  { id: 1, src: "assets/generated/liquid-glass-shadow.png", category: "abstract", label: "Liquid Glass Shadow", section: "static", free: true },
  { id: 2, src: "assets/generated/icy-blue-glacier.png", category: "nature", label: "Icy Blue Glacier", section: "static", free: true },
  { id: 3, src: "assets/generated/amoled-blue-pulse.png", category: "minimal", label: "AMOLED Blue Pulse", section: "static", free: true },
  { id: 4, src: "assets/generated/neon-rain-cyber-glow.png", category: "cyberpunk", label: "Neon Rain Cyber Glow", section: "static", free: true },
  { id: 5, src: "assets/generated/cosmic-drift.png", category: "abstract", label: "Cosmic Drift", section: "static", free: true },
  { id: 6, src: "assets/generated/forest-light-loop.png", category: "nature", label: "Forest Light Loop", section: "static", free: true },
];

const liveWallpapers = [
  { id: 101, src: "assets/live/09-07.mp4", videoUrl: "assets/live/09-07.mp4", category: "nature", label: "Mountain Light", section: "live", free: false, points: 15 },
  { id: 102, src: "assets/live/11-0850d1ae0cc526e3ae9356b4dd41fdcf.mp4", videoUrl: "assets/live/11-0850d1ae0cc526e3ae9356b4dd41fdcf.mp4", category: "minimal", label: "Blue Light Trail", section: "live", free: false, points: 15 },
  { id: 103, src: "assets/live/20-102148a60657b50a2fd5a2b2cbc6a86c.mp4", videoUrl: "assets/live/20-102148a60657b50a2fd5a2b2cbc6a86c.mp4", category: "abstract", label: "Red Light Trail", section: "live", free: false, points: 15 },
  { id: 104, src: "assets/live/30-1728319144338.mp4", videoUrl: "assets/live/30-1728319144338.mp4", category: "cyberpunk", label: "Rain City Glass", section: "live", free: false, points: 15 },
  { id: 105, src: "assets/live/safe-motion-rain-glass-neon-alley.mp4", videoUrl: "assets/live/safe-motion-rain-glass-neon-alley.mp4", category: "cyberpunk", label: "Rain Glass Neon Alley", section: "live", free: false, points: 15 },
  { id: 106, src: "assets/live/safe-motion-black-aurora-light-trails.mp4", videoUrl: "assets/live/safe-motion-black-aurora-light-trails.mp4", category: "minimal", label: "Black Aurora Light Trails", section: "live", free: false, points: 15 },
  { id: 107, src: "assets/live/safe-motion-snow-peak-dream-loop.mp4", videoUrl: "assets/live/safe-motion-snow-peak-dream-loop.mp4", category: "nature", label: "Snow Peak Dream Loop", section: "live", free: false, points: 15 },
];

// AI custom samples.
const aiWallpapers = [
  { id: 201, src: "assets/generated/liquid-glass-shadow.png", category: "abstract", label: "Liquid Glass Style", section: "custom", free: false, points: 20 },
  { id: 202, src: "assets/generated/forest-light-loop.png", category: "nature", label: "Forest Glow Style", section: "custom", free: false, points: 20 },
  { id: 203, src: "assets/generated/neon-rain-cyber-glow.png", category: "cyberpunk", label: "Neon Rain Style", section: "custom", free: false, points: 20 },
];
let aiTextWallpapers = [];
const aiWorkflowSamples = [
  { id: 401, src: "assets/generated/liquid-glass-halo.png", category: "custom", label: "文生图样例", section: "custom", mode: "text-image", free: false, points: 20, workflowPreview: true, badge: "文生图" },
  { id: 402, src: "assets/generated/forest-deer-glow.png", category: "custom", label: "真人转CG样例", section: "custom", mode: "cg-image", free: false, points: 20, workflowPreview: true, badge: "CG" },
  { id: 403, src: "assets/live/safe-motion-rain-glass-neon-alley.mp4", videoUrl: "assets/live/safe-motion-rain-glass-neon-alley.mp4", category: "custom", label: "图生视频样例", section: "custom", mode: "image-video", free: false, points: 20, workflowPreview: true, badge: "视频" },
  { id: 404, src: "assets/ai-workflows/face-swap-result.mp4", videoUrl: "assets/ai-workflows/face-swap-result.mp4", category: "custom", label: "AI视频人物替换样例", section: "custom", mode: "face-swap", free: false, points: 20, workflowPreview: true, badge: "换脸" },
  { id: 405, src: "assets/generated/poetcore-moon-desk.png", category: "custom", label: "AI双人合影样例", section: "custom", mode: "couple-photo", free: false, points: 20, workflowPreview: true, badge: "合影" },
];
const aiWorkflows = {
  "text-image": {
    title: "文生图",
    copy: "输入提示词生成手机壁纸。默认 9:16 竖图，消耗 20 积分。",
    fields: [
      { key: "prompt", type: "prompt", label: "提示词", placeholder: "在此输入提示词" },
    ],
  },
  "cg-image": {
    title: "图生图 - 真人转CG",
    copy: "上传真人照片，生成 CG 风格成品。下方示例图用于展示效果方向。",
    fields: [
      { key: "image", type: "image", label: "真人照片", caption: "在此上传你的照片", sample: "assets/generated/forest-deer-glow.png" },
    ],
  },
  "image-video": {
    title: "图生视频",
    copy: "上传图片并输入运动提示词，默认生成 5 秒视频。",
    fields: [
      { key: "image", type: "image", label: "上传图片", caption: "上传要生成视频的图片", sample: "assets/generated/rain-glass-neon-alley.png" },
      { key: "prompt", type: "prompt", label: "视频提示词", placeholder: "在此输入提示词" },
    ],
  },
  "face-swap": {
    title: "AI视频人物替换",
    copy: "上传原视频和替换人脸，参考右侧成品效果生成 5 秒视频。",
    fields: [
      { key: "video", type: "video", label: "原视频", caption: "上传要替换人物的原视频", sample: "assets/ai-workflows/face-swap-original.mp4" },
      { key: "face", type: "image", label: "替换人脸", caption: "上传替换的人脸照片", sample: "assets/ai-workflows/face-swap-face.png" },
      { key: "result", type: "output-video", label: "成品视频", caption: "生成后在此预览并下载", sample: "assets/ai-workflows/face-swap-result.mp4" },
    ],
  },
  "couple-photo": {
    title: "AI双人合影",
    copy: "上传两张人物照片，生成自然双人合影。",
    fields: [
      { key: "image", type: "image", label: "人物照片 1", caption: "上传第一张照片", sample: "assets/generated/analog-paper-flower.png" },
      { key: "image2", type: "image", label: "人物照片 2", caption: "上传第二张照片", sample: "assets/generated/jelly-pastel-shapes.png" },
    ],
  },
};
const aiWorkflowState = {};

// ===== 鐘舵€?=====
let currentSection = "static";
let currentCategory = "all";
let currentSearch = "";
let currentSort = "popular";
let currentAiMode = "text-image";
let userPoints = 0;
let extraWallpapers = [];
let extraIdCounter = 1000;
let managedStaticWallpapers = [];
const translations = {
  en: {
    "meta.title": "TK Wallpaper - Free HD & Live Wallpapers",
    "meta.description": "Free HD wallpapers, live wallpapers and AI custom wallpapers for your phone and desktop.",
    "lang.label": "Language",
    "nav.menu": "Menu",
    "nav.close": "Close",
    "cat.all": "All",
    "cat.abstract": "Abstract",
    "cat.animals": "Animals",
    "cat.anime": "Anime",
    "cat.car": "Car",
    "cat.cool": "Cool",
    "cat.custom": "Custom",
    "cat.cyberpunk": "Cyberpunk",
    "cat.fantasy": "Fantasy",
    "cat.funny": "Funny",
    "cat.lucky": "Lucky",
    "cat.minimal": "Minimal",
    "cat.mystic": "Mystic",
    "cat.nature": "Nature",
    "cat.scenery": "Scenery",
    "cat.sciFi": "Sci-Fi",
    "cat.wealth": "Wealth",
    "auth.login": "Login",
    "auth.logout": "Logout",
    "auth.signup": "Sign Up",
    "auth.noAccount": "Don't have an account?",
    "auth.haveAccount": "Already have an account?",
    "auth.createAccount": "Create Account",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.note": "New users get 10 free credits to try AI wallpapers!",
    "points.get": "Get Points",
    "points.my": "My Points:",
    "points.hint.live": "Live downloads use 15 credits.",
    "points.hint.custom": "AI generations use 20 credits each.",
    "points.getCredits": "Get Credits",
    "points.buyCopy": "Buy credits to download live wallpapers and AI custom wallpapers.",
    "points.afterPurchase": "After purchase, credits will be added to your account automatically.",
    "hero.title": "Wallpapers for Your Phone",
    "hero.copy": "Free static wallpapers, premium live wallpapers, and AI custom wallpapers. Updated with trending styles weekly.",
    "browse.eyebrow": "Popular phone wallpapers",
    "browse.title.all": "All {section} Wallpapers",
    "browse.title.category": "{category} {section} Wallpapers",
    "browse.subtitle.default": "Browse free static wallpapers, premium live wallpapers, and AI custom samples in a phone-first grid.",
    "browse.subtitle.static": "Browse free phone wallpapers by category, style, and trend.",
    "browse.subtitle.live": "Preview moving wallpapers in the grid, then download premium loops with credits.",
    "browse.subtitle.custom": "Explore AI custom samples, upload your own image, and generate a live wallpaper.",
    "sort.popular": "Popular",
    "sort.latest": "Latest",
    "sort.downloaded": "Most Downloaded",
    "section.static": "Static",
    "section.live": "Live",
    "section.custom": "AI Custom",
    "section.staticTitle": "Static",
    "section.liveTitle": "Live",
    "section.customTitle": "AI Custom",
    "helper.static": "Free HD phone wallpapers for quick downloads.",
    "helper.live": "Preview moving wallpapers first, then download with credits.",
    "helper.custom": "Upload a photo or write a prompt to generate AI wallpapers.",
    "search.placeholder": "Search wallpapers...",
    "results.count": "{count} wallpaper",
    "results.countPlural": "{count} wallpapers",
    "results.empty": "No wallpapers found. Try a different search or category.",
    "ai.imageMode": "Image to Image",
    "ai.textMode": "Text to Image",
    "ai.copy.image": "Upload your photo, preview the target motion style, then generate a live wallpaper.",
    "ai.copy.text": "Start from a text prompt, preview proven styles, then generate a fresh AI wallpaper.",
    "ai.prompt.placeholder": "Describe your wallpaper style...",
    "ai.generateText": "Generate Text Wallpaper (20 pts)",
    "upload.title": "Add Your Own Image",
    "upload.copy": "Upload a photo to turn it into a live wallpaper.",
    "upload.choose": "Choose from Gallery",
    "upload.hint": "Upload your own photo to generate",
    "loadMore": "Load More",
    "footer.copy": "TK Wallpaper © 2026. Free wallpapers for personal use. Live wallpapers and AI wallpapers require points.",
    "download": "Download",
    "download.withPoints": "Download ({points} pts)",
    "download.regenerate": "Regenerate (20 pts)",
    "lightbox.liveVideo": "1080 x 1920 - Live Video",
    "lightbox.phone": "1080 x 1920 - Phone",
    "compare.before": "Before (Static)",
    "compare.after": "After (Live Wallpaper)",
    "compare.uploadPhoto": "Upload Your Photo",
    "compare.upload": "Upload Photo",
    "compare.delete": "Delete",
    "compare.clickGenerate": "Click Generate",
    "compare.generate": "Generate Live Wallpaper (20 pts)",
    "status.processing": "Processing...",
    "status.uploadingImage": "Uploading image...",
    "status.creatingLive": "AI creating live wallpaper... (1-5 min)",
    "status.processingSeconds": "Processing... ({seconds}s)",
    "status.failed": "Failed. Please try again.",
    "status.timedOut": "Timed out. Credits were restored.",
    "status.error": "Error: {message}",
    "pricing.credits100": "100 Credits",
    "pricing.credits200": "200 Credits",
    "pricing.credits500": "500 Credits",
    "pricing.credits1200": "1200 Credits",
    "pricing.gen5": "5 AI generations",
    "pricing.gen10": "10 AI generations - Save 12%",
    "pricing.gen25": "25 AI generations - Save 35%",
    "pricing.gen60": "60 AI generations - Best value",
    "pricing.bestSeller": "BEST SELLER",
    "card.text": "Text",
    "card.live": "Live",
    "card.free": "Free",
    "card.previewText": "Preview text style - {points} credits",
    "card.previewLive": "Preview live - {points} credits",
    "card.freeDownload": "Free download",
    "toast.downloaded": "Downloaded! {points} pts used.",
    "toast.downloadFailed": "Download failed: {message}",
    "toast.longPress": "Long-press the image and save, then set as wallpaper in phone settings.",
    "toast.imageCleared": "Image cleared. Upload a new one.",
    "toast.generated": "Live wallpaper generated!",
    "toast.uploading": "Uploading...",
    "toast.uploadedGenerate": "Image uploaded! Click it to generate.",
    "toast.uploadedClickGenerate": "Image uploaded! Click Generate to create live wallpaper.",
    "toast.uploadFailed": "Upload failed: {message}",
    "toast.enterPrompt": "Enter a text prompt first.",
    "toast.textApiPending": "Text-to-image generation API will be connected after workflow confirmation.",
    "toast.fillAuth": "Please fill in email and password.",
    "toast.welcome": "Welcome! {email}",
    "toast.loggedOut": "Logged out.",
    "toast.error": "Error: {message}",
  },
  es: {
    "meta.title": "TK Wallpaper - Fondos HD y animados gratis",
    "meta.description": "Fondos HD gratis, fondos animados y fondos AI personalizados para tu teléfono y escritorio.",
    "lang.label": "Idioma",
    "nav.menu": "Menú",
    "nav.close": "Cerrar",
    "cat.all": "Todos",
    "cat.abstract": "Abstracto",
    "cat.animals": "Animales",
    "cat.anime": "Anime",
    "cat.car": "Autos",
    "cat.cool": "Cool",
    "cat.custom": "Personalizado",
    "cat.cyberpunk": "Cyberpunk",
    "cat.fantasy": "Fantasía",
    "cat.funny": "Divertidos",
    "cat.lucky": "Suerte",
    "cat.minimal": "Minimal",
    "cat.mystic": "Místico",
    "cat.nature": "Naturaleza",
    "cat.scenery": "Paisajes",
    "cat.sciFi": "Sci-Fi",
    "cat.wealth": "Riqueza",
    "auth.login": "Iniciar sesión",
    "auth.logout": "Salir",
    "auth.signup": "Registrarse",
    "auth.noAccount": "¿No tienes cuenta?",
    "auth.haveAccount": "¿Ya tienes cuenta?",
    "auth.createAccount": "Crear cuenta",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.note": "Los usuarios nuevos reciben 10 créditos gratis para probar fondos AI.",
    "points.get": "Comprar puntos",
    "points.my": "Mis puntos:",
    "points.hint.live": "Las descargas animadas usan 15 créditos.",
    "points.hint.custom": "Las generaciones AI usan 20 créditos cada una.",
    "points.getCredits": "Comprar créditos",
    "points.buyCopy": "Compra créditos para descargar fondos animados y fondos AI personalizados.",
    "points.afterPurchase": "Después de comprar, los créditos se añadirán automáticamente a tu cuenta.",
    "hero.title": "Fondos para tu teléfono",
    "hero.copy": "Fondos estáticos gratis, fondos animados premium y fondos AI personalizados. Actualizado cada semana con estilos tendencia.",
    "browse.eyebrow": "Fondos populares para móvil",
    "browse.title.all": "Fondos {section}: todos",
    "browse.title.category": "Fondos {section}: {category}",
    "browse.subtitle.default": "Explora fondos estáticos gratis, fondos animados premium y muestras AI en una cuadrícula pensada para móvil.",
    "browse.subtitle.static": "Explora fondos gratis por categoría, estilo y tendencia.",
    "browse.subtitle.live": "Previsualiza fondos en movimiento y descarga loops premium con créditos.",
    "browse.subtitle.custom": "Explora muestras AI, sube tu imagen y genera un fondo animado.",
    "sort.popular": "Populares",
    "sort.latest": "Recientes",
    "sort.downloaded": "Más descargados",
    "section.static": "Estáticos",
    "section.live": "Animados",
    "section.custom": "AI Custom",
    "section.staticTitle": "estáticos",
    "section.liveTitle": "animados",
    "section.customTitle": "AI personalizados",
    "helper.static": "Fondos HD gratis para descargar rápido.",
    "helper.live": "Previsualiza fondos en movimiento y descárgalos con créditos.",
    "helper.custom": "Sube una foto o escribe un prompt para generar fondos AI.",
    "search.placeholder": "Buscar fondos...",
    "results.count": "{count} fondo",
    "results.countPlural": "{count} fondos",
    "results.empty": "No se encontraron fondos. Prueba otra búsqueda o categoría.",
    "ai.imageMode": "Imagen a imagen",
    "ai.textMode": "Texto a imagen",
    "ai.copy.image": "Sube tu foto, previsualiza el estilo animado y genera un fondo.",
    "ai.copy.text": "Empieza con un prompt, revisa estilos probados y genera un fondo AI nuevo.",
    "ai.prompt.placeholder": "Describe el estilo del fondo...",
    "ai.generateText": "Generar fondo con texto (20 pts)",
    "upload.title": "Añade tu imagen",
    "upload.copy": "Sube una foto para convertirla en fondo animado.",
    "upload.choose": "Elegir de la galería",
    "upload.hint": "Sube tu propia foto para generar",
    "loadMore": "Cargar más",
    "footer.copy": "TK Wallpaper © 2026. Fondos gratis para uso personal. Los fondos animados y AI requieren puntos.",
    "download": "Descargar",
    "download.withPoints": "Descargar ({points} pts)",
    "download.regenerate": "Regenerar (20 pts)",
    "lightbox.liveVideo": "1080 x 1920 - Video animado",
    "lightbox.phone": "1080 x 1920 - Teléfono",
    "compare.before": "Antes (estático)",
    "compare.after": "Después (fondo animado)",
    "compare.uploadPhoto": "Sube tu foto",
    "compare.upload": "Subir foto",
    "compare.delete": "Eliminar",
    "compare.clickGenerate": "Haz clic en generar",
    "compare.generate": "Generar fondo animado (20 pts)",
    "status.processing": "Procesando...",
    "status.uploadingImage": "Subiendo imagen...",
    "status.creatingLive": "AI está creando el fondo animado... (1-5 min)",
    "status.processingSeconds": "Procesando... ({seconds}s)",
    "status.failed": "Falló. Inténtalo de nuevo.",
    "status.timedOut": "Tiempo agotado. Se restauraron los créditos.",
    "status.error": "Error: {message}",
    "pricing.credits100": "100 créditos",
    "pricing.credits200": "200 créditos",
    "pricing.credits500": "500 créditos",
    "pricing.credits1200": "1200 créditos",
    "pricing.gen5": "5 generaciones AI",
    "pricing.gen10": "10 generaciones AI - Ahorra 12%",
    "pricing.gen25": "25 generaciones AI - Ahorra 35%",
    "pricing.gen60": "60 generaciones AI - Mejor valor",
    "pricing.bestSeller": "MÁS VENDIDO",
    "card.text": "Texto",
    "card.live": "Animado",
    "card.free": "Gratis",
    "card.previewText": "Ver estilo de texto - {points} créditos",
    "card.previewLive": "Ver animación - {points} créditos",
    "card.freeDownload": "Descarga gratis",
    "toast.downloaded": "Descargado. {points} pts usados.",
    "toast.downloadFailed": "Falló la descarga: {message}",
    "toast.longPress": "Mantén pulsada la imagen, guárdala y configúrala como fondo en tu teléfono.",
    "toast.imageCleared": "Imagen eliminada. Sube una nueva.",
    "toast.generated": "Fondo animado generado.",
    "toast.uploading": "Subiendo...",
    "toast.uploadedGenerate": "Imagen subida. Haz clic para generar.",
    "toast.uploadedClickGenerate": "Imagen subida. Haz clic en Generar para crear un fondo animado.",
    "toast.uploadFailed": "Falló la subida: {message}",
    "toast.enterPrompt": "Escribe primero un prompt.",
    "toast.textApiPending": "La API de texto a imagen se conectará después de confirmar el flujo.",
    "toast.fillAuth": "Completa el correo y la contraseña.",
    "toast.welcome": "Bienvenido: {email}",
    "toast.loggedOut": "Sesión cerrada.",
    "toast.error": "Error: {message}",
  },
};
const categoryLabelKeys = {
  all: "cat.all",
  abstract: "cat.abstract",
  animals: "cat.animals",
  anime: "cat.anime",
  car: "cat.car",
  cool: "cat.cool",
  custom: "cat.custom",
  cyberpunk: "cat.cyberpunk",
  fantasy: "cat.fantasy",
  funny: "cat.funny",
  lucky: "cat.lucky",
  minimal: "cat.minimal",
  mystic: "cat.mystic",
  nature: "cat.nature",
  scenery: "cat.scenery",
  "sci-fi": "cat.sciFi",
  wealth: "cat.wealth",
};
const sectionTitleKeys = {
  static: "section.staticTitle",
  live: "section.liveTitle",
  custom: "section.customTitle",
};
let currentLang = "en";
try {
  currentLang = localStorage.getItem("tk_lang") === "es" ? "es" : "en";
} catch {}

function t(key, vars = {}) {
  const textPack = translations[currentLang] || translations.en;
  let text = textPack[key] || translations.en[key] || key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace(new RegExp(`\\{${name}\\}`, "g"), () => String(value ?? ""));
  });
  return text;
}

function getCategoryLabel(category) {
  if (categoryLabelKeys[category]) return t(categoryLabelKeys[category]);
  return category.charAt(0).toUpperCase() + category.slice(1);
}
const localVideoPool = [
  "assets/live/09-07.mp4",
  "assets/live/11-0850d1ae0cc526e3ae9356b4dd41fdcf.mp4",
  "assets/live/20-102148a60657b50a2fd5a2b2cbc6a86c.mp4",
  "assets/live/30-1728319144338.mp4",
  "assets/live/safe-motion-rain-glass-neon-alley.mp4",
  "assets/live/safe-motion-black-aurora-light-trails.mp4",
  "assets/live/safe-motion-snow-peak-dream-loop.mp4",
];

// ===== DOM 鍏冪礌 =====
const grid = document.getElementById("wallpaperGrid");
const navLinks = document.querySelectorAll(".nav-link");
const sectionTabs = document.querySelectorAll(".section-tab");
const sortTabs = document.querySelectorAll(".sort-tab");
const searchInput = document.getElementById("searchInput");
const loadMoreBtn = document.getElementById("loadMore");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxVideo = document.getElementById("lightboxVideo");
const lightboxRes = document.getElementById("lightboxRes");
const lightboxClose = document.getElementById("lightboxClose");
const btnDownload = document.getElementById("btnDownload");
const btnSetWallpaper = document.getElementById("btnSetWallpaper");
const menuToggle = document.getElementById("menuToggle");
const languageSelect = document.getElementById("languageSelect");
const navEl = document.getElementById("mainNav");
const pointsBar = document.getElementById("pointsBar");
const pointsDisplay = document.getElementById("pointsDisplay");
const pointsAccount = document.getElementById("pointsAccount");
const buyPointButtons = document.querySelectorAll(".js-buy-points");
const sectionHelper = document.getElementById("sectionHelper");
const pointsHint = document.getElementById("pointsHint");
const browseTitle = document.getElementById("browseTitle");
const browseSubtitle = document.getElementById("browseSubtitle");
const resultsCount = document.getElementById("resultsCount");
const activeBrowseMode = document.getElementById("activeBrowseMode");
const pointsToast = document.getElementById("pointsToast");
const purchaseModal = document.getElementById("purchaseModal");
const purchaseModalClose = document.getElementById("purchaseModalClose");

const aiModePanel = document.getElementById("aiModePanel");
const aiModeTabs = document.querySelectorAll(".ai-mode-tab");
const aiModeCopy = document.getElementById("aiModeCopy");
const aiWorkflowPanel = document.getElementById("aiWorkflowPanel");
const aiTextPromptBox = document.getElementById("aiTextPromptBox");
const aiTextPrompt = document.getElementById("aiTextPrompt");
const aiTextGenerate = document.getElementById("aiTextGenerate");
const aiUploadArea = document.getElementById("aiUploadArea");
const aiFileInput = document.getElementById("aiFileInput");
const aiBtnUpload = document.getElementById("aiBtnUpload");
const compareModal = document.getElementById("compareModal");
const compareClose = document.getElementById("compareClose");
const compareImg = document.getElementById("compareImg");
const compareImgWrap = document.getElementById("compareImgWrap");
const comparePlaceholder = document.getElementById("comparePlaceholder");
const compareVideo = document.getElementById("compareVideo");
const compareResultImg = document.getElementById("compareResultImg");
const compareResultPlaceholder = document.getElementById("compareResultPlaceholder");
const compareDelete = document.getElementById("compareDelete");
const compareUpload = document.getElementById("compareUpload");
const compareDownload = document.getElementById("compareDownload");
const compareBtnGenerate = document.getElementById("compareBtnGenerate");
const compareStatus = document.getElementById("compareStatus");
const compareStatusText = document.getElementById("compareStatusText");

let currentCustomItem = null;

function updateLightboxLabels() {
  if (!lightbox.classList.contains("show")) return;
  lightboxRes.textContent = lightbox.dataset.currentVideo === "1" ? t("lightbox.liveVideo") : t("lightbox.phone");
  const points = parseInt(lightbox.dataset.currentPoints) || 0;
  btnDownload.textContent = lightbox.dataset.currentFree === "1" ? t("download") : t("download.withPoints", { points });
}

function updateCompareGenerateButtonLabel() {
  if (!compareBtnGenerate) return;
  compareBtnGenerate.textContent = currentCustomItem?.generatedByUser ? t("download.regenerate") : t("compare.generate");
}

function setCompareStatusText(key, vars = {}) {
  if (!compareStatusText) return;
  compareStatusText.dataset.statusKey = key;
  compareStatusText.dataset.statusVars = JSON.stringify(vars);
  compareStatusText.textContent = t(key, vars);
}

function refreshCompareStatusText() {
  if (!compareStatusText?.dataset.statusKey) return;
  let vars = {};
  try { vars = JSON.parse(compareStatusText.dataset.statusVars || "{}"); } catch {}
  compareStatusText.textContent = t(compareStatusText.dataset.statusKey, vars);
}

function updateActiveBrowseMode() {
  if (!activeBrowseMode) return;
  const activeSort = document.querySelector(".sort-tab.active");
  activeBrowseMode.textContent = activeSort ? activeSort.textContent.trim() : t("sort.popular");
}

function updateSectionCopy() {
  if (sectionHelper) sectionHelper.textContent = t(`helper.${currentSection}`);
  if (pointsHint) {
    pointsHint.textContent = currentSection === "custom" ? t("points.hint.custom") : t("points.hint.live");
  }
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.title = t("meta.title");
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.setAttribute("content", t("meta.description"));

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  if (languageSelect) {
    languageSelect.value = currentLang;
    languageSelect.setAttribute("aria-label", t("lang.label"));
  }
  if (menuToggle && navEl) menuToggle.textContent = navEl.classList.contains("open") ? t("nav.close") : t("nav.menu");

  updateSectionCopy();
  updateAiModeUI();
  updateBrowseCopy();
  updateActiveBrowseMode();
  setAuthMode(authMode);
  updateLightboxLabels();
  updateCompareGenerateButtonLabel();
  refreshCompareStatusText();
}

function updatePointsBarVisibility() {
  if (currentSection === "live" || currentSection === "custom") {
    pointsBar.style.display = "flex";
  } else {
    pointsBar.style.display = "none";
  }
  if (pointsAccount) pointsAccount.style.display = currentUser ? "inline-flex" : "none";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function mediaPreviewHTML(field, src) {
  if (!src) return '<span>+</span>';
  if (field.type === "video" || field.type === "output-video") {
    return `<video src="${escapeHtml(src)}" muted loop playsinline autoplay controls></video>`;
  }
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(field.label)}">`;
}

function workflowFieldHTML(field) {
  if (field.type === "prompt") {
    const value = aiWorkflowState[currentAiMode]?.[field.key] || "";
    return `
      <label class="ai-workflow-field">
        <span class="ai-workflow-label">${escapeHtml(field.label)}</span>
        <textarea class="ai-workflow-textarea js-ai-prompt" data-field="${escapeHtml(field.key)}" placeholder="${escapeHtml(field.placeholder || "在此输入提示词")}">${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  const selected = aiWorkflowState[currentAiMode]?.[field.key];
  const selectedUrl = selected?.previewUrl || "";
  const previewSrc = selectedUrl || field.sample || "";
  const accept = field.type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/*";
  const tile = `
    <div class="ai-upload-tile ${field.type === "output-video" ? "ai-output-tile" : ""}" data-field="${escapeHtml(field.key)}">
      <div class="ai-upload-preview">${mediaPreviewHTML(field, previewSrc)}</div>
      <div class="ai-upload-caption">
        <strong>${escapeHtml(field.label)}</strong>
        <span>${escapeHtml(selected?.file?.name || field.caption || "")}</span>
      </div>
    </div>
  `;
  if (field.type === "output-video") {
    return `
      <div class="ai-workflow-field">
        ${tile}
        ${field.sample ? `<a class="btn-small" href="${escapeHtml(field.sample)}" download>下载示例</a>` : ""}
      </div>
    `;
  }
  return `
    <label class="ai-workflow-field">
      <input class="js-ai-file" data-field="${escapeHtml(field.key)}" type="file" accept="${accept}" style="display:none;">
      ${tile}
    </label>
  `;
}

function renderAiWorkflowPanel() {
  if (!aiWorkflowPanel) return;
  const workflow = aiWorkflows[currentAiMode] || aiWorkflows["text-image"];
  if (aiModeCopy) aiModeCopy.textContent = workflow.copy;
  aiWorkflowState[currentAiMode] ||= {};
  aiWorkflowPanel.innerHTML = `
    <div class="ai-workflow-grid">
      ${workflow.fields.map(workflowFieldHTML).join("")}
    </div>
    <div class="ai-workflow-actions">
      <button class="btn-generate" id="aiWorkflowGenerate">生成（20积分）</button>
      <span class="ai-workflow-status" id="aiWorkflowStatus">${escapeHtml(workflow.title)} API 已配置</span>
    </div>
  `;

  aiWorkflowPanel.querySelectorAll(".js-ai-prompt").forEach(input => {
    input.addEventListener("input", () => {
      aiWorkflowState[currentAiMode][input.dataset.field] = input.value;
    });
  });
  aiWorkflowPanel.querySelectorAll(".js-ai-file").forEach(input => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const fieldKey = input.dataset.field;
      const previewUrl = URL.createObjectURL(file);
      aiWorkflowState[currentAiMode][fieldKey] = { file, previewUrl };
      renderAiWorkflowPanel();
    });
  });
  const generateBtn = document.getElementById("aiWorkflowGenerate");
  if (generateBtn) generateBtn.addEventListener("click", runAiWorkflow);
}

function updateAiModeUI() {
  if (aiModePanel) aiModePanel.style.display = currentSection === "custom" ? "block" : "none";
  if (aiUploadArea) aiUploadArea.style.display = "none";
  if (aiTextPromptBox) aiTextPromptBox.style.display = "none";
  aiModeTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.aiMode === currentAiMode));
  renderAiWorkflowPanel();
}

function setWallpaperSection(section) {
  currentSection = section;
  sectionTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.section === section));
  updateBrowseCopy();
  updateSectionCopy();
  updatePointsBarVisibility();
  updateAiModeUI();
  if (window.location.hash) {
    applyRouteFromHash();
  } else {
    applyFilter();
  }
}

function setAiMode(mode) {
  currentAiMode = aiWorkflows[mode] ? mode : "text-image";
  currentCategory = "all";
  navLinks.forEach(link => link.classList.toggle("active", link.dataset.category === "all"));
  updateAiModeUI();
  updateBrowseCopy();
  applyFilter();
}

window.setWallpaperSection = setWallpaperSection;
window.setAiMode = setAiMode;

// ===== 鏁版嵁鑾峰彇 =====
function getSectionData() {
  if (currentSection === "static") {
    const baseStatic = managedStaticWallpapers.length ? managedStaticWallpapers : staticWallpapers;
    return baseStatic.concat(extraWallpapers.filter(w => w.section === "static")).slice(0, 500);
  }
  if (currentSection === "live") return liveWallpapers.concat(extraWallpapers.filter(w => w.section === "live"));
  if (currentSection === "custom") {
    const textSamples = aiTextWallpapers.map(item => ({ ...item, mode: "text-image", workflowPreview: true, badge: "文生图" }));
    const baseCustom = currentAiMode === "text-image" && textSamples.length
      ? textSamples
      : aiWorkflowSamples.filter(item => item.mode === currentAiMode);
    return baseCustom.concat(extraWallpapers.filter(w => w.section === "custom" && (w.mode || "text-image") === currentAiMode));
  }
  return [];
}

async function loadWallpaperManifests() {
  try {
    const staticResp = await fetch("data/static-wallpapers.json", { cache: "no-store" });
    if (staticResp.ok) {
      const items = await staticResp.json();
      if (Array.isArray(items)) managedStaticWallpapers = items.filter(item => item && item.src).slice(0, 500);
    }
  } catch {}

  try {
    const liveResp = await fetch("data/live-wallpapers.json", { cache: "no-store" });
    if (liveResp.ok) {
      const items = await liveResp.json();
      if (Array.isArray(items) && items.length) liveWallpapers.splice(0, liveWallpapers.length, ...items.filter(item => item && item.videoUrl));
    }
  } catch {}

  try {
    const aiResp = await fetch("data/ai-samples.json", { cache: "no-store" });
    if (aiResp.ok) {
      const items = await aiResp.json();
      if (Array.isArray(items) && items.length) aiWallpapers.splice(0, aiWallpapers.length, ...items.filter(item => item && item.src));
    }
  } catch {}

  try {
    const textResp = await fetch("data/ai-text-samples.json", { cache: "no-store" });
    if (textResp.ok) {
      const items = await textResp.json();
      if (Array.isArray(items) && items.length) aiTextWallpapers = items.filter(item => item && item.src).slice(0, 20);
    }
  } catch {}

  applyFilter();
}

function getFilteredData() {
  let data = getSectionData();
  updateCategoryAvailability(data);
  if (currentCategory !== "all") {
    data = data.filter(item => item.category === currentCategory);
  }
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    data = data.filter(item => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }
  return sortWallpapers(data);
}

function updateCategoryAvailability(data) {
  let activeCategoryHasItems = currentCategory === "all";
  navLinks.forEach(link => {
    const category = link.dataset.category;
    const hasItems = category === "all" || data.some(item => item.category === category);
    link.style.display = hasItems ? "" : "none";
    if (category === currentCategory && hasItems) activeCategoryHasItems = true;
  });
  if (!activeCategoryHasItems) {
    currentCategory = "all";
    navLinks.forEach(link => link.classList.toggle("active", link.dataset.category === "all"));
    updateBrowseCopy();
  }
}

function sortWallpapers(data) {
  const items = data.slice();
  if (currentSort === "latest") return items.reverse();
  if (currentSort === "downloaded") return items.sort((a, b) => (a.free === b.free ? b.id - a.id : a.free ? -1 : 1));
  return items.sort((a, b) => (b.points || 0) - (a.points || 0) || a.id - b.id);
}

// ===== 娓叉煋鍗＄墖 =====
function renderCards(data) {
  grid.innerHTML = "";
  if (resultsCount) resultsCount.textContent = t(data.length === 1 ? "results.count" : "results.countPlural", { count: data.length });
  if (data.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:#777;grid-column:1/-1;padding:60px 0;">${t("results.empty")}</p>`;
    return;
  }
  data.forEach(item => {
    const card = document.createElement("div");

    let badgeHTML = "";
    let extraClass = "";
    if (item.section === "custom" && item.mode === "text") {
      badgeHTML = `<span class="card-badge badge-points">${item.points || 20}P</span><span class="card-badge-dynamic">${t("card.text")}</span>`;
    } else if (item.section === "custom" && item.workflowPreview) {
      badgeHTML = `<span class="card-badge badge-points">${item.points || 20}P</span><span class="card-badge-dynamic">${escapeHtml(item.badge || "AI")}</span>`;
      extraClass = item.videoUrl ? " card-dynamic" : "";
    } else if (item.section === "custom") {
      badgeHTML = `<span class="card-badge badge-points">20P</span><span class="card-badge-dynamic">${t("card.live")}</span>`;
      extraClass = " card-dynamic";
    } else if (item.free === false) {
      badgeHTML = `<span class="card-badge badge-points">${item.points}P</span>`;
    } else {
      badgeHTML = `<span class="card-badge badge-free">${t("card.free")}</span>`;
    }

    card.className = "wallpaper-card" + extraClass;
    const mediaHTML = item.videoUrl
      ? `<video src="${item.videoUrl}" muted loop playsinline autoplay preload="metadata" aria-label="${item.label}"></video>`
      : `<img src="${item.src}" alt="${item.label}" loading="lazy">`;
    const actionHint = item.workflowPreview
      ? `${item.badge || "AI"} 预览 - ${item.points || 20} credits`
      : item.free === false
      ? t(item.mode === "text" ? "card.previewText" : "card.previewLive", { points: item.points })
      : t("card.freeDownload");
    card.innerHTML = `
      ${mediaHTML}
      <span class="card-label">${escapeHtml(item.label)}</span>
      <span class="card-action-hint">${actionHint}</span>
      ${badgeHTML}
    `;
    card.addEventListener("click", () => {
      if (item.workflowPreview) {
        openLightbox(item);
      } else if (item.section === "custom" && item.mode === "text") {
        openTextPreview(item);
      } else if (item.section === "custom") {
        openCompareModal(item);
      } else {
        openLightbox(item);
      }
    });
    grid.appendChild(card);
  });
}

// ===== 鏉垮潡鍒囨崲 =====
sectionTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    sectionTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentSection = tab.dataset.section;
    updateBrowseCopy();
    updateSectionCopy();

    updatePointsBarVisibility();

    if (currentSection === "custom") {
      updateAiModeUI();
    } else {
      updateAiModeUI();
    }

    applyFilter();
  });
});

document.addEventListener("click", (event) => {
  const tab = event.target.closest(".section-tab");
  if (!tab || !tab.dataset.section) return;
  if (tab.classList.contains("active") && currentSection === tab.dataset.section) return;
  sectionTabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  currentSection = tab.dataset.section;
  updateBrowseCopy();
  updateSectionCopy();
  updatePointsBarVisibility();
  updateAiModeUI();
  applyFilter();
});

function applyRouteFromHash() {
  const href = window.location.href || "";
  const hash = (window.location.hash || "").replace("#", "");
  if (hash === "live" || href.endsWith("#live")) {
    currentSection = "live";
    currentAiMode = "text-image";
  } else if (hash === "custom-text-image" || hash === "custom-text" || href.includes("#custom-text")) {
    currentSection = "custom";
    currentAiMode = "text-image";
  } else if (hash === "custom-cg-image" || hash === "custom-image" || href.includes("#custom-cg-image") || href.includes("#custom-image")) {
    currentSection = "custom";
    currentAiMode = "cg-image";
  } else if (hash === "custom-image-video" || href.includes("#custom-image-video")) {
    currentSection = "custom";
    currentAiMode = "image-video";
  } else if (hash === "custom-face-swap" || href.includes("#custom-face-swap")) {
    currentSection = "custom";
    currentAiMode = "face-swap";
  } else if (hash === "custom-couple-photo" || href.includes("#custom-couple-photo")) {
    currentSection = "custom";
    currentAiMode = "couple-photo";
  } else if (hash === "custom" || href.endsWith("#custom")) {
    currentSection = "custom";
    currentAiMode = "text-image";
  } else {
    currentSection = "static";
    currentAiMode = "text-image";
  }
  currentCategory = "all";
  sectionTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.section === currentSection));
  navLinks.forEach(link => link.classList.toggle("active", link.dataset.category === "all"));
  updateBrowseCopy();
  updateSectionCopy();
  updatePointsBarVisibility();
  updateAiModeUI();
  applyFilter();
}

window.addEventListener("hashchange", applyRouteFromHash);

aiModeTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    currentAiMode = tab.dataset.aiMode || "image";
    currentCategory = "all";
    navLinks.forEach(link => link.classList.toggle("active", link.dataset.category === "all"));
    updateAiModeUI();
    updateBrowseCopy();
    applyFilter();
  });
});

sortTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    sortTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentSort = tab.dataset.sort;
    updateActiveBrowseMode();
    applyFilter();
  });
});

// ===== 鍒嗙被鍒囨崲 =====
navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    currentCategory = link.dataset.category;
    updateBrowseCopy();
    applyFilter();
  });
});

function updateBrowseCopy() {
  const categoryLabel = getCategoryLabel(currentCategory);
  const sectionLabel = t(sectionTitleKeys[currentSection] || "section.staticTitle");
  if (browseTitle) {
    browseTitle.textContent = currentCategory === "all"
      ? t("browse.title.all", { section: sectionLabel })
      : t("browse.title.category", { category: categoryLabel, section: sectionLabel });
  }
  if (!browseSubtitle) return;
  browseSubtitle.textContent = t(`browse.subtitle.${currentSection}`);
}

// ===== 鎼滅储 =====
let searchTimer;
function isLikelyAutofillEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function clearSearchAutofill({ rerender = false } = {}) {
  if (!searchInput || !isLikelyAutofillEmail(searchInput.value)) return false;
  searchInput.value = "";
  currentSearch = "";
  if (rerender) applyFilter();
  return true;
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const rawSearch = searchInput.value.trim();
    if (isLikelyAutofillEmail(rawSearch)) {
      searchInput.value = "";
      currentSearch = "";
    } else {
      currentSearch = rawSearch;
    }
    applyFilter();
  }, 300);
});

function applyFilter() {
  const filtered = getFilteredData();
  renderCards(filtered);
}

// ===== 鍔犺浇鏇村 =====
loadMoreBtn.addEventListener("click", () => {
  const categories = ["nature", "abstract", "cyberpunk", "minimal", "car", "anime", "animals", "wealth", "lucky", "funny", "cool", "mystic", "sci-fi", "scenery", "fantasy"];
  const count = currentSection === "live" || currentSection === "custom" ? 4 : 8;
  const staticPool = (managedStaticWallpapers.length ? managedStaticWallpapers : staticWallpapers).filter(item => item.src);
  const customPool = getSectionData().filter(item => item.src);
  for (let i = 0; i < count; i++) {
    const staticItem = staticPool[Math.floor(Math.random() * staticPool.length)];
    const customItem = customPool[Math.floor(Math.random() * customPool.length)];
    const videoUrl = localVideoPool[Math.floor(Math.random() * localVideoPool.length)];
    const baseItem = currentSection === "custom" ? customItem : staticItem;
    const cat = baseItem?.category || categories[Math.floor(Math.random() * categories.length)];
    const label = baseItem?.label || cat.charAt(0).toUpperCase() + cat.slice(1);
    extraWallpapers.push({
      id: Date.now() + i,
      src: currentSection === "live" ? videoUrl : baseItem?.src,
      category: cat,
      label: label,
      section: currentSection,
      free: currentSection === "static",
      points: currentSection === "live" ? 15 : currentSection === "custom" ? 20 : 0,
      videoUrl: currentSection === "static" ? "" : videoUrl,
      mode: currentSection === "custom" ? currentAiMode : undefined,
    });
  }
  applyFilter();
});

// ===== 鏅€氬脊绐楋紙闈欐€?鍔ㄦ€佹澘鍧楋級 =====
function openLightbox(item) {
  if (item.videoUrl) {
    lightboxImg.style.display = "none";
    lightboxVideo.style.display = "block";
    lightboxVideo.src = item.videoUrl;
    lightboxVideo.play().catch(() => {});
  } else {
    lightboxVideo.pause();
    lightboxVideo.src = "";
    lightboxVideo.style.display = "none";
    lightboxImg.style.display = "block";
    lightboxImg.src = item.src;
    lightboxImg.alt = item.label;
  }
  lightboxRes.textContent = item.videoUrl ? t("lightbox.liveVideo") : t("lightbox.phone");
  lightbox.dataset.currentSrc = item.videoUrl || item.src;
  lightbox.dataset.currentLabel = item.label;
  lightbox.dataset.currentPoints = item.points || 0;
  lightbox.dataset.currentFree = item.free ? "1" : "0";
  lightbox.dataset.currentVideo = item.videoUrl ? "1" : "0";
  lightbox.classList.add("show");
  document.body.style.overflow = "hidden";
  updateLightboxLabels();
  btnSetWallpaper.style.display = "none";
}

function closeLightbox() {
  lightbox.classList.remove("show");
  lightboxVideo.pause();
  lightboxVideo.src = "";
  document.body.style.overflow = "";
}
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

function openTextPreview(item) {
  openLightbox({
    ...item,
    free: false,
    points: item.points || 20,
    videoUrl: "",
  });
}

async function downloadWallpaperAsset({ src, label, points = 0, free = true, isVideo = false }) {
  if (!free && !currentUser) { showAuthModal("login"); return; }
  if (!free && userPoints < points) { showPurchaseModal(); return; }
  try {
    if (!free) {
      const downloadResp = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify({ src, label, points }),
      });
      const downloadData = await downloadResp.json();
      if (downloadResp.status === 402) {
        userPoints = downloadData.points ?? userPoints;
        updatePointsDisplay();
        showPurchaseModal();
        return;
      }
      if (!downloadResp.ok) throw new Error(downloadData.error || "Download authorization failed");
      src = downloadData.url;
      userPoints = downloadData.points ?? userPoints;
      updatePointsDisplay();
    }
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = isVideo ? ".mp4" : ".jpg";
    a.download = label.replace(/\s+/g, "-").toLowerCase() + ext;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (!free) showToast(t("toast.downloaded", { points }));
  } catch (err) {
    showToast(t("toast.downloadFailed", { message: err.message }));
  }
}

btnDownload.addEventListener("click", async () => {
  await downloadWallpaperAsset({
    src: lightbox.dataset.currentSrc,
    label: lightbox.dataset.currentLabel || "wallpaper",
    points: parseInt(lightbox.dataset.currentPoints) || 0,
    free: lightbox.dataset.currentFree === "1",
    isVideo: lightbox.dataset.currentVideo === "1",
  });
});

btnSetWallpaper.addEventListener("click", () => {
  showToast(t("toast.longPress"));
});

// ===== AI 鑷畾涔夊姣斿脊绐?=====
function openCompareModal(item) {
  currentCustomItem = item;
  // 宸︼細闈欐€佸浘
  if (item.src) {
    compareImg.src = item.src;
    compareImg.style.display = "block";
    comparePlaceholder.style.display = "none";
  } else {
    compareImg.src = "";
    compareImg.style.display = "none";
    comparePlaceholder.style.display = "flex";
  }
  if (item.videoUrl) {
    compareVideo.src = item.videoUrl;
    compareVideo.style.display = "block";
    compareResultPlaceholder.style.display = "none";
  } else {
    compareVideo.src = "";
    compareVideo.style.display = "none";
    compareResultPlaceholder.style.display = "flex";
  }
  compareImg.alt = item.label || "";
  compareStatus.style.display = "none";
  delete compareStatusText.dataset.statusKey;
  delete compareStatusText.dataset.statusVars;
  compareBtnGenerate.style.display = "inline-block";
  updateCompareGenerateButtonLabel();
  compareModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeCompareModal() {
  compareModal.classList.remove("show");
  document.body.style.overflow = "";
  currentCustomItem = null;
}
compareClose.addEventListener("click", closeCompareModal);
compareModal.addEventListener("click", (e) => { if (e.target === compareModal) closeCompareModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && compareModal.classList.contains("show")) closeCompareModal(); });

compareDelete.addEventListener("click", () => {
  if (!currentCustomItem) return;
  currentCustomItem.src = "";
  currentCustomItem.videoUrl = "";
  compareImg.src = "";
  compareImg.style.display = "none";
  comparePlaceholder.style.display = "flex";
  compareVideo.src = "";
  compareVideo.style.display = "none";
  compareResultPlaceholder.style.display = "flex";
  showToast(t("toast.imageCleared"));
});

// 涓嬭浇瑙嗛
compareDownload.addEventListener("click", async () => {
  if (!currentCustomItem || !currentCustomItem.videoUrl) return;
  await downloadWallpaperAsset({
    src: currentCustomItem.videoUrl,
    label: currentCustomItem.label || "ai-live-wallpaper",
    points: currentCustomItem.generatedByUser ? 0 : (currentCustomItem.points || 20),
    free: !!currentCustomItem.generatedByUser,
    isVideo: true,
  });
});

// 鐢熸垚
compareBtnGenerate.addEventListener("click", async () => {
  if (!currentCustomItem) return;
  if (!currentUser) { showAuthModal("login"); return; }
  if (userPoints < 20) {
    showPurchaseModal();
    return;
  }

  userPoints -= 20;
  await updatePointsToDB(userPoints);
  await logTransaction("generation", -20, "Live wallpaper: " + (currentCustomItem.label || ""));

  compareStatus.style.display = "flex";
  compareBtnGenerate.style.display = "none";
  setCompareStatusText("status.uploadingImage");

  try {
    const imageUrl = new URL(currentCustomItem.src, window.location.origin).toString();
    const submitResp = await fetch("/api/generate-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    const submitData = await submitResp.json();
    if (!submitData.success) throw new Error(submitData.error || "Submit failed");

    const taskId = submitData.taskId;
    setCompareStatusText("status.creatingLive");

    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 10000));
      attempts++;
      const queryResp = await fetch(`/api/generate-live?taskId=${taskId}`);
      const queryData = await queryResp.json();
      setCompareStatusText("status.processingSeconds", { seconds: attempts * 10 });

      if (queryData.status === "SUCCESS") {
        const resultUrl = queryData.results?.[0]?.url || queryData.results?.[0];
        if (resultUrl) {
          currentCustomItem.videoUrl = resultUrl;
          currentCustomItem.generatedByUser = true;
          compareVideo.src = resultUrl;
          compareVideo.style.display = "block";
          compareResultPlaceholder.style.display = "none";
          compareVideo.loop = true;
          compareVideo.muted = true;
          compareVideo.playsInline = true;
          compareVideo.autoplay = true;
          compareVideo.setAttribute("playsinline", "");
          compareVideo.play().catch(() => {});
          compareStatus.style.display = "none";
          compareBtnGenerate.style.display = "inline-block";
          updateCompareGenerateButtonLabel();
          showToast(t("toast.generated"));
        }
        break;
      } else if (queryData.status === "FAILED") {
        setCompareStatusText("status.failed");
        compareBtnGenerate.style.display = "inline-block";
        userPoints += 20; await updatePointsToDB(userPoints);
        break;
      }
    }
    if (attempts >= 60 && compareStatus.style.display !== "none") {
      setCompareStatusText("status.timedOut");
      compareBtnGenerate.style.display = "inline-block";
      userPoints += 20; await updatePointsToDB(userPoints);
    }
  } catch (err) {
    setCompareStatusText("status.error", { message: err.message });
    compareBtnGenerate.style.display = "inline-block";
    userPoints += 20; await updatePointsToDB(userPoints);
  }
});

function setAiWorkflowStatus(message) {
  const status = document.getElementById("aiWorkflowStatus");
  if (status) status.textContent = message;
}

function setAiWorkflowBusy(isBusy) {
  const button = document.getElementById("aiWorkflowGenerate");
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? "生成中..." : "生成（20积分）";
}

function findResultUrl(value, seen = new Set()) {
  if (!value || seen.has(value)) return "";
  if (typeof value === "string") return /^https?:\/\//.test(value) ? value : "";
  if (typeof value !== "object") return "";
  seen.add(value);
  if (typeof value.url === "string" && /^https?:\/\//.test(value.url)) return value.url;
  if (typeof value.fileUrl === "string" && /^https?:\/\//.test(value.fileUrl)) return value.fileUrl;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findResultUrl(item, seen);
      if (found) return found;
    }
    return "";
  }
  for (const item of Object.values(value)) {
    const found = findResultUrl(item, seen);
    if (found) return found;
  }
  return "";
}

function showAiWorkflowResult(mode, resultUrl) {
  if (!resultUrl || !aiWorkflowPanel) return;
  const isVideo = mode === "image-video" || mode === "face-swap";
  const outputTile = aiWorkflowPanel.querySelector(".ai-output-tile");
  const resultMedia = isVideo
    ? `<video src="${escapeHtml(resultUrl)}" controls loop muted playsinline autoplay></video>`
    : `<img src="${escapeHtml(resultUrl)}" alt="AI result">`;
  const resultHTML = `
    <div class="ai-upload-preview">${resultMedia}</div>
    <div class="ai-upload-caption">
      <strong>生成结果</strong>
      <a href="${escapeHtml(resultUrl)}" download>下载成品</a>
    </div>
  `;
  if (outputTile) {
    outputTile.innerHTML = resultHTML;
  } else {
    aiWorkflowPanel.querySelector(".ai-workflow-grid")?.insertAdjacentHTML("beforeend", `
      <div class="ai-workflow-field">
        <div class="ai-upload-tile ai-output-tile">${resultHTML}</div>
      </div>
    `);
  }
}

async function pollAiWorkflowResult(taskId, mode) {
  for (let attempt = 1; attempt <= 45; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const queryResp = await fetch(`/api/ai-workflow?taskId=${encodeURIComponent(taskId)}`);
    const queryData = await queryResp.json();
    setAiWorkflowStatus(`生成中... ${attempt * 10}s`);
    if (queryData.status === "SUCCESS" || queryData.data?.status === "SUCCESS") {
      const resultUrl = findResultUrl(queryData);
      if (resultUrl) {
        showAiWorkflowResult(mode, resultUrl);
        setAiWorkflowStatus("生成完成，可预览和下载成品。");
      } else {
        setAiWorkflowStatus("任务完成，但没有识别到结果链接，请稍后到 RunningHub 后台查看。");
      }
      return true;
    }
    if (queryData.status === "FAILED" || queryData.data?.status === "FAILED") {
      throw new Error("RunningHub task failed");
    }
  }
  throw new Error("Timed out");
}

async function buildAiWorkflowPayload(mode) {
  const workflow = aiWorkflows[mode];
  const state = aiWorkflowState[mode] || {};
  const payload = { mode };

  for (const field of workflow.fields) {
    if (field.type === "prompt") {
      const prompt = String(state[field.key] || "").trim();
      if (!prompt) throw new Error("请先输入提示词");
      payload.prompt = prompt;
    }
    if (field.type === "image") {
      const file = state[field.key]?.file;
      if (!file) throw new Error(`请上传${field.label}`);
      setAiWorkflowStatus(`正在上传${field.label}...`);
      const url = await uploadFileToR2(file);
      if (field.key === "image2") payload.imageUrl2 = url;
      else if (field.key === "face") payload.faceUrl = url;
      else payload.imageUrl = url;
    }
    if (field.type === "video") {
      const file = state[field.key]?.file;
      if (!file) throw new Error(`请上传${field.label}`);
      setAiWorkflowStatus(`正在上传${field.label}...`);
      payload.videoUrl = await uploadFileToR2(file);
    }
  }
  return payload;
}

async function runAiWorkflow() {
  const mode = currentAiMode;
  const workflow = aiWorkflows[mode];
  if (!workflow) return;
  if (!currentUser) { showAuthModal("login"); return; }
  if (userPoints < 20) { showPurchaseModal(); return; }

  setAiWorkflowBusy(true);
  let charged = false;
  try {
    const payload = await buildAiWorkflowPayload(mode);
    userPoints -= 20;
    charged = true;
    await updatePointsToDB(userPoints);
    await logTransaction("generation", -20, workflow.title);

    setAiWorkflowStatus("正在提交 RunningHub 任务...");
    const submitResp = await fetch("/api/ai-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const submitData = await submitResp.json();
    if (!submitResp.ok || !submitData.success || !submitData.taskId) {
      throw new Error(submitData.error || "Submit failed");
    }
    setAiWorkflowStatus(`任务已提交：${submitData.taskId}`);
    await pollAiWorkflowResult(submitData.taskId, mode);
  } catch (err) {
    setAiWorkflowStatus("生成失败：" + err.message);
    if (charged) {
      userPoints += 20;
      await updatePointsToDB(userPoints);
    }
  } finally {
    setAiWorkflowBusy(false);
  }
}

// ===== 鏂囦欢涓婁紶鍒?R2 =====
async function uploadFileToR2(file) {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await resp.json();
  if (!data.success) throw new Error(data.error || "Upload failed");
  return data.url;
}

aiBtnUpload.addEventListener("click", () => aiFileInput.click());
aiFileInput.addEventListener("change", async () => {
  const file = aiFileInput.files[0];
  if (!file) return;
  try {
    showToast(t("toast.uploading"));
    const url = await uploadFileToR2(file);
    aiWallpapers.push({
      id: Date.now(),
      src: url,
      videoUrl: "",
      category: "custom",
      label: file.name.split(".")[0] || "My Wallpaper",
      section: "custom",
      free: false,
      points: 20,
    });
    applyFilter();
    showToast(t("toast.uploadedGenerate"));
  } catch (err) {
    showToast(t("toast.uploadFailed", { message: err.message }));
  }
  aiFileInput.value = "";
});

// 瀵规瘮寮圭獥涓細涓婁紶鏇挎崲闈欐€佸浘
compareUpload.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file || !currentCustomItem) return;
    try {
      showToast(t("toast.uploading"));
      const url = await uploadFileToR2(file);
      currentCustomItem.src = url;
      compareImg.src = url;
      compareImg.style.display = "block";
      comparePlaceholder.style.display = "none";
      showToast(t("toast.uploadedClickGenerate"));
    } catch (err) {
      showToast(t("toast.uploadFailed", { message: err.message }));
    }
  };
  input.click();
});

if (aiTextGenerate && aiTextPrompt) {
  aiTextGenerate.addEventListener("click", () => {
    const prompt = aiTextPrompt.value.trim();
    if (!prompt) { showToast(t("toast.enterPrompt")); return; }
    if (!currentUser) { showAuthModal("login"); return; }
    if (userPoints < 20) { showPurchaseModal(); return; }
    showToast(t("toast.textApiPending"));
  });
}

// ===== 绉垎绯荤粺 =====
const headerPointsDisplay = document.getElementById("headerPointsDisplay");

function updatePointsDisplay() {
  pointsDisplay.textContent = userPoints;
  headerPointsDisplay.textContent = userPoints;
  updatePointsBarVisibility();
}

function showPurchaseModal() {
  purchaseModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

buyPointButtons.forEach(b => b.addEventListener("click", showPurchaseModal));

purchaseModalClose.addEventListener("click", () => {
  purchaseModal.classList.remove("show");
  document.body.style.overflow = "";
});
purchaseModal.addEventListener("click", (e) => {
  if (e.target === purchaseModal) {
    purchaseModal.classList.remove("show");
    document.body.style.overflow = "";
  }
});

function showToast(msg) {
  pointsToast.textContent = msg;
  pointsToast.classList.add("show");
  clearTimeout(pointsToast._timeout);
  pointsToast._timeout = setTimeout(() => {
    pointsToast.classList.remove("show");
  }, 2500);
}

// ===== 鎵嬫満鑿滃崟 =====
if (menuToggle && navEl) {
  menuToggle.addEventListener("click", () => {
    navEl.classList.toggle("open");
    menuToggle.textContent = navEl.classList.contains("open") ? t("nav.close") : t("nav.menu");
  });
}
document.addEventListener("click", (e) => {
  if (menuToggle && navEl && !e.target.closest(".header") && navEl.classList.contains("open")) {
    navEl.classList.remove("open");
    menuToggle.textContent = t("nav.menu");
  }
});

// ===== 鐧诲綍/娉ㄥ唽 =====
const authModal = document.getElementById("authModal");
const authModalClose = document.getElementById("authModalClose");
const authModalTitle = document.getElementById("authModalTitle");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authBtnSubmit = document.getElementById("authBtnSubmit");
const authToggle = document.getElementById("authToggle");
const authSwitchText = document.getElementById("authSwitchText");
const headerNotLoggedIn = document.getElementById("headerNotLoggedIn");
const headerLoggedIn = document.getElementById("headerLoggedIn");
const headerEmail = document.getElementById("headerEmail");
const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

let authMode = "login"; // "login" | "signup"

if (languageSelect) {
  languageSelect.addEventListener("change", () => {
    currentLang = languageSelect.value === "es" ? "es" : "en";
    try { localStorage.setItem("tk_lang", currentLang); } catch {}
    applyTranslations();
    applyFilter();
  });
}

function setAuthMode(mode) {
  authMode = mode;
  if (mode === "login") {
    authModalTitle.textContent = t("auth.login");
    authBtnSubmit.textContent = t("auth.login");
    authSwitchText.textContent = t("auth.noAccount");
    authToggle.textContent = t("auth.signup");
  } else {
    authModalTitle.textContent = t("auth.createAccount");
    authBtnSubmit.textContent = t("auth.signup");
    authSwitchText.textContent = t("auth.haveAccount");
    authToggle.textContent = t("auth.login");
  }
}

function showAuthModal(mode = "login") {
  setAuthMode(mode);
  authModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideAuthModal() {
  authModal.classList.remove("show");
  document.body.style.overflow = "";
}

function updateAuthUI(user) {
  currentUser = user;
  if (user) {
    headerNotLoggedIn.style.display = "none";
    headerLoggedIn.style.display = "flex";
    headerEmail.textContent = user.email;
    fetchPoints().then(pts => {
      userPoints = pts;
      updatePointsDisplay();
    });
  } else {
    headerNotLoggedIn.style.display = "flex";
    headerLoggedIn.style.display = "none";
    userPoints = 0;
    updatePointsDisplay();
  }
  updatePointsBarVisibility();
}

// 鐧诲綍/娉ㄥ唽鎻愪氦
authBtnSubmit.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) { showToast(t("toast.fillAuth")); return; }
  try {
    if (authMode === "signup") {
      const r = await signupUser(email, password);
      if (r.error || r.error_description) { showToast(t("toast.error", { message: r.error_description || r.error })); return; }
      if (r.id || r.user?.id) {
        // 鑷姩鐧诲綍
        await loginUser(email, password);
        // 鎵嬪姩鍒涘缓 profile锛坰ervice key 缁曡繃 RLS锛?        try { userPoints = await ensureUserProfile(); } catch {}
        updateAuthUI(currentUser);
        hideAuthModal();
        showToast(t("toast.welcome", { email }));
        return;
      }
      showToast(t("toast.error", { message: r.msg || JSON.stringify(r) }));
    } else {
      const user = await loginUser(email, password);
      updateAuthUI(user);
      hideAuthModal();
      showToast(t("toast.welcome", { email: user.email }));
    }
  } catch (err) { showToast(t("toast.error", { message: err.message })); }
});

// 鍒囨崲鐧诲綍/娉ㄥ唽
authToggle.addEventListener("click", (e) => {
  e.preventDefault();
  setAuthMode(authMode === "login" ? "signup" : "login");
});

// 鎵撳紑鐧诲綍寮圭獥
btnLogin.addEventListener("click", () => showAuthModal("login"));

btnLogout.addEventListener("click", () => {
  logoutUser();
  updateAuthUI(null);
  showToast(t("toast.loggedOut"));
});

// 鍏抽棴寮圭獥
authModalClose.addEventListener("click", hideAuthModal);
authModal.addEventListener("click", (e) => { if (e.target === authModal) hideAuthModal(); });

// 椤甸潰鍔犺浇锛氬绾哥珛鍗冲彲瑙侊紝鐧诲綍寮傛鎭㈠
clearSearchAutofill();
updatePointsDisplay();
applyTranslations();
renderCards(staticWallpapers);
loadWallpaperManifests();
if (window.location.hash) applyRouteFromHash();
window.addEventListener("pageshow", () => clearSearchAutofill({ rerender: true }));
setTimeout(() => clearSearchAutofill({ rerender: true }), 250);
setTimeout(() => clearSearchAutofill({ rerender: true }), 1200);

restoreSavedSession();

