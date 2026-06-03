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

// ===== 鐘舵€?=====
let currentSection = "static";
let currentCategory = "all";
let currentSearch = "";
let currentSort = "popular";
let currentAiMode = "image";
let userPoints = 0;
let extraWallpapers = [];
let extraIdCounter = 1000;
let managedStaticWallpapers = [];
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

function updatePointsBarVisibility() {
  if (currentSection === "live" || currentSection === "custom") {
    pointsBar.style.display = "flex";
  } else {
    pointsBar.style.display = "none";
  }
  if (pointsAccount) pointsAccount.style.display = currentUser ? "inline-flex" : "none";
}

function updateAiModeUI() {
  if (aiModePanel) aiModePanel.style.display = currentSection === "custom" ? "block" : "none";
  if (aiUploadArea) aiUploadArea.style.display = currentSection === "custom" && currentAiMode === "image" ? "block" : "none";
  if (aiTextPromptBox) aiTextPromptBox.style.display = currentSection === "custom" && currentAiMode === "text" ? "flex" : "none";
  if (aiModeCopy) {
    aiModeCopy.textContent = currentAiMode === "image"
      ? "Upload your photo, preview the target motion style, then generate a live wallpaper."
      : "Start from a text prompt, preview proven styles, then generate a fresh AI wallpaper.";
  }
  aiModeTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.aiMode === currentAiMode));
}

function setWallpaperSection(section) {
  currentSection = section;
  sectionTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.section === section));
  updateBrowseCopy();
  if (sectionHelper) {
    sectionHelper.textContent = currentSection === "static"
      ? "Free HD phone wallpapers for quick downloads."
      : currentSection === "live"
        ? "Preview moving wallpapers first, then download with credits."
        : "Upload a photo or write a prompt to generate AI wallpapers.";
  }
  if (pointsHint) {
    pointsHint.textContent = currentSection === "custom"
      ? "AI generations use 20 credits each."
      : "Live downloads use 15 credits each.";
  }
  updatePointsBarVisibility();
  updateAiModeUI();
  if (window.location.hash) {
    applyRouteFromHash();
  } else {
    applyFilter();
  }
}

function setAiMode(mode) {
  currentAiMode = mode || "image";
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
    const baseCustom = currentAiMode === "text" ? aiTextWallpapers : aiWallpapers;
    return baseCustom.concat(extraWallpapers.filter(w => w.section === "custom" && (w.mode || "image") === currentAiMode));
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
  if (resultsCount) resultsCount.textContent = data.length + (data.length === 1 ? " wallpaper" : " wallpapers");
  if (data.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#777;grid-column:1/-1;padding:60px 0;">No wallpapers found. Try a different search or category.</p>';
    return;
  }
  data.forEach(item => {
    const card = document.createElement("div");

    let badgeHTML = "";
    let extraClass = "";
    if (item.section === "custom" && item.mode === "text") {
      badgeHTML = `<span class="card-badge badge-points">${item.points || 20}P</span><span class="card-badge-dynamic">Text</span>`;
    } else if (item.section === "custom") {
      badgeHTML = '<span class="card-badge badge-points">20P</span><span class="card-badge-dynamic">Live</span>';
      extraClass = " card-dynamic";
    } else if (item.free === false) {
      badgeHTML = `<span class="card-badge badge-points">${item.points}P</span>`;
    } else {
      badgeHTML = '<span class="card-badge badge-free">Free</span>';
    }

    card.className = "wallpaper-card" + extraClass;
    const mediaHTML = item.videoUrl
      ? `<video src="${item.videoUrl}" muted loop playsinline autoplay preload="metadata" aria-label="${item.label}"></video>`
      : `<img src="${item.src}" alt="${item.label}" loading="lazy">`;
    card.innerHTML = `
      ${mediaHTML}
      <span class="card-label">${item.label}</span>
      <span class="card-action-hint">${item.free === false ? (item.mode === "text" ? "Preview text style - " : "Preview live - ") + item.points + " credits" : "Free download"}</span>
      ${badgeHTML}
    `;
    card.addEventListener("click", () => {
      if (item.section === "custom" && item.mode === "text") {
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
    if (sectionHelper) {
      sectionHelper.textContent = currentSection === "static"
        ? "Free HD phone wallpapers for quick downloads."
        : currentSection === "live"
          ? "Preview moving wallpapers first, then download with credits."
          : "Upload a photo and generate a live wallpaper sample.";
    }
    if (pointsHint) {
      pointsHint.textContent = currentSection === "custom"
        ? "AI generations use 20 credits each."
        : "Live downloads use 15 credits each.";
    }

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
  if (sectionHelper) {
    sectionHelper.textContent = currentSection === "static"
      ? "Free HD phone wallpapers for quick downloads."
      : currentSection === "live"
        ? "Preview moving wallpapers first, then download with credits."
        : "Upload a photo or write a prompt to generate AI wallpapers.";
  }
  if (pointsHint) {
    pointsHint.textContent = currentSection === "custom"
      ? "AI generations use 20 credits each."
      : "Live downloads use 15 credits each.";
  }
  updatePointsBarVisibility();
  updateAiModeUI();
  applyFilter();
});

function applyRouteFromHash() {
  const href = window.location.href || "";
  const hash = (window.location.hash || "").replace("#", "");
  if (hash === "live" || href.endsWith("#live")) {
    currentSection = "live";
    currentAiMode = "image";
  } else if (hash === "custom-text" || href.includes("#custom-text")) {
    currentSection = "custom";
    currentAiMode = "text";
  } else if (hash === "custom-image" || hash === "custom" || href.includes("#custom-image") || href.endsWith("#custom")) {
    currentSection = "custom";
    currentAiMode = "image";
  } else {
    currentSection = "static";
    currentAiMode = "image";
  }
  currentCategory = "all";
  sectionTabs.forEach(tab => tab.classList.toggle("active", tab.dataset.section === currentSection));
  navLinks.forEach(link => link.classList.toggle("active", link.dataset.category === "all"));
  updateBrowseCopy();
  if (sectionHelper) {
    sectionHelper.textContent = currentSection === "static"
      ? "Free HD phone wallpapers for quick downloads."
      : currentSection === "live"
        ? "Preview moving wallpapers first, then download with credits."
        : "Upload a photo or write a prompt to generate AI wallpapers.";
  }
  if (pointsHint) {
    pointsHint.textContent = currentSection === "custom"
      ? "AI generations use 20 credits each."
      : "Live downloads use 15 credits each.";
  }
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
    if (activeBrowseMode) activeBrowseMode.textContent = tab.textContent.trim();
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
  const categoryLabel = currentCategory === "all" ? "All" : currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
  const sectionLabel = currentSection === "custom" ? "AI Custom" : currentSection.charAt(0).toUpperCase() + currentSection.slice(1);
  if (browseTitle) browseTitle.textContent = categoryLabel + " " + sectionLabel + " Wallpapers";
  if (!browseSubtitle) return;
  browseSubtitle.textContent = currentSection === "static"
    ? "Browse free phone wallpapers by category, style, and trend."
    : currentSection === "live"
      ? "Preview moving wallpapers in the grid, then download premium loops with credits."
      : "Explore AI custom samples, upload your own image, and generate a live wallpaper.";
}

// ===== 鎼滅储 =====
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = searchInput.value.trim();
    applyFilter();
  }, 300);
});

function applyFilter() {
  const filtered = getFilteredData();
  renderCards(filtered);
}

// ===== 鍔犺浇鏇村 =====
loadMoreBtn.addEventListener("click", () => {
  const categories = ["nature", "abstract", "cyberpunk", "minimal", "car"];
  const count = currentSection === "live" || currentSection === "custom" ? 4 : 8;
  const staticPool = (managedStaticWallpapers.length ? managedStaticWallpapers : staticWallpapers).filter(item => item.src);
  const customPool = (currentAiMode === "text" ? aiTextWallpapers : aiWallpapers).filter(item => item.src);
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
  lightboxRes.textContent = item.videoUrl ? "1080 x 1920 路 Live Video" : "1080 x 1920 路 Phone";
  lightbox.dataset.currentSrc = item.videoUrl || item.src;
  lightbox.dataset.currentLabel = item.label;
  lightbox.dataset.currentPoints = item.points || 0;
  lightbox.dataset.currentFree = item.free ? "1" : "0";
  lightbox.dataset.currentVideo = item.videoUrl ? "1" : "0";
  lightbox.classList.add("show");
  document.body.style.overflow = "hidden";

  if (item.free === false) {
    btnDownload.textContent = "Download (" + item.points + " pts)";
    btnSetWallpaper.style.display = "none";
  } else {
    btnDownload.textContent = "Download";
    btnSetWallpaper.style.display = "none";
  }
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
    if (!free) showToast("Downloaded! " + points + " pts used.");
  } catch (err) {
    showToast("Download failed: " + err.message);
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
  showToast("Long-press the image and save, then set as wallpaper in phone settings.");
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
  compareBtnGenerate.style.display = "inline-block";
  compareBtnGenerate.textContent = "Generate Live Wallpaper (20 pts)";
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
  showToast("Image cleared. Upload a new one.");
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
  compareStatusText.textContent = "Uploading image...";

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
    compareStatusText.textContent = "AI creating live wallpaper... (1-5 min)";

    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 10000));
      attempts++;
      const queryResp = await fetch(`/api/generate-live?taskId=${taskId}`);
      const queryData = await queryResp.json();
      compareStatusText.textContent = `Processing... (${attempts * 10}s)`;

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
          compareBtnGenerate.textContent = "Regenerate (20 pts)";
          showToast("Live wallpaper generated!");
        }
        break;
      } else if (queryData.status === "FAILED") {
        compareStatusText.textContent = "Failed. Please try again.";
        compareBtnGenerate.style.display = "inline-block";
        userPoints += 20; await updatePointsToDB(userPoints);
        break;
      }
    }
    if (attempts >= 60 && compareStatus.style.display !== "none") {
      compareStatusText.textContent = "Timed out. Credits were restored.";
      compareBtnGenerate.style.display = "inline-block";
      userPoints += 20; await updatePointsToDB(userPoints);
    }
  } catch (err) {
    compareStatusText.textContent = "Error: " + err.message;
    compareBtnGenerate.style.display = "inline-block";
    userPoints += 20; await updatePointsToDB(userPoints);
  }
});

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
    showToast("Uploading...");
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
    showToast("Image uploaded! Click it to generate.");
  } catch (err) {
    showToast("Upload failed: " + err.message);
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
      showToast("Uploading...");
      const url = await uploadFileToR2(file);
      currentCustomItem.src = url;
      compareImg.src = url;
      compareImg.style.display = "block";
      comparePlaceholder.style.display = "none";
      showToast("Image uploaded! Click Generate to create live wallpaper.");
    } catch (err) {
      showToast("Upload failed: " + err.message);
    }
  };
  input.click();
});

aiTextGenerate.addEventListener("click", () => {
  const prompt = aiTextPrompt.value.trim();
  if (!prompt) { showToast("Enter a text prompt first."); return; }
  if (!currentUser) { showAuthModal("login"); return; }
  if (userPoints < 20) { showPurchaseModal(); return; }
  showToast("Text-to-image generation API will be connected after workflow confirmation.");
});

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
menuToggle.addEventListener("click", () => {
  navEl.classList.toggle("open");
  menuToggle.textContent = navEl.classList.contains("open") ? "Close" : "Menu";
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".header") && navEl.classList.contains("open")) {
    navEl.classList.remove("open");
    menuToggle.textContent = "Menu";
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

function setAuthMode(mode) {
  authMode = mode;
  if (mode === "login") {
    authModalTitle.textContent = "Login";
    authBtnSubmit.textContent = "Login";
    authSwitchText.textContent = "Don't have an account?";
    authToggle.textContent = "Sign Up";
  } else {
    authModalTitle.textContent = "Create Account";
    authBtnSubmit.textContent = "Sign Up";
    authSwitchText.textContent = "Already have an account?";
    authToggle.textContent = "Login";
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
  if (!email || !password) { showToast("Please fill in email and password."); return; }
  try {
    if (authMode === "signup") {
      const r = await signupUser(email, password);
      if (r.error || r.error_description) { showToast("Error: " + (r.error_description || r.error)); return; }
      if (r.id || r.user?.id) {
        // 鑷姩鐧诲綍
        await loginUser(email, password);
        // 鎵嬪姩鍒涘缓 profile锛坰ervice key 缁曡繃 RLS锛?        try { userPoints = await ensureUserProfile(); } catch {}
        updateAuthUI(currentUser);
        hideAuthModal();
        showToast("Welcome! " + email);
        return;
      }
      showToast("Error: " + (r.msg || JSON.stringify(r)));
    } else {
      const user = await loginUser(email, password);
      updateAuthUI(user);
      hideAuthModal();
      showToast("Welcome! " + user.email);
    }
  } catch (err) { showToast("Error: " + err.message); }
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
  showToast("Logged out.");
});

// 鍏抽棴寮圭獥
authModalClose.addEventListener("click", hideAuthModal);
authModal.addEventListener("click", (e) => { if (e.target === authModal) hideAuthModal(); });

// 椤甸潰鍔犺浇锛氬绾哥珛鍗冲彲瑙侊紝鐧诲綍寮傛鎭㈠
updatePointsDisplay();
updateAiModeUI();
renderCards(staticWallpapers);
loadWallpaperManifests();
if (window.location.hash) applyRouteFromHash();

restoreSavedSession();

