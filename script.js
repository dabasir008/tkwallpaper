// ===== 轻量 Supabase 客户端（不依赖外部 SDK） =====
const SB = "https://cctguqfxiihtjtpntdqb.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdGd1cWZ4aWlodGp0cG50ZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDcxODcsImV4cCI6MjA5NTYyMzE4N30.C2SznOpOWW3JjB_ZIe6hB_yuHVQjkO4ye4ZZmHY2EWs";
const SB_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdGd1cWZ4aWlodGp0cG50ZHFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0NzE4NywiZXhwIjoyMDk1NjIzMTg3fQ.DMsP_oCbErs7VEu49IXS5CgIGPzg8t70Rir6R1KZyTM";

let authAvailable = true;
let currentUser = null;
let userAccessToken = "";

// 恢复本地 session
try {
  const saved = JSON.parse(localStorage.getItem("sb_session") || "null");
  if (saved && saved.token && saved.user) {
    currentUser = saved.user;
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
    const data = await sbApi(`/rest/v1/profiles?id=eq.${currentUser.id}&select=points`, { headers: { Prefer: "return=representation" } });
    if (Array.isArray(data) && data[0]) return data[0].points ?? 0;
    return ensureUserProfile();
  } catch { return ensureUserProfile(); }
}

async function ensureUserProfile() {
  if (!currentUser) return 0;
  const serviceHeaders = {
    apikey: SB_SERVICE_KEY,
    Authorization: `Bearer ${SB_SERVICE_KEY}`,
    Prefer: "return=representation",
  };
  const existing = await sbApi(`/rest/v1/profiles?id=eq.${currentUser.id}&select=points`, {
    skipKey: true,
    headers: serviceHeaders,
  });
  if (Array.isArray(existing) && existing[0]) return existing[0].points ?? 0;

  const created = await sbApi("/rest/v1/profiles", {
    method: "POST",
    body: JSON.stringify({ id: currentUser.id, email: currentUser.email, points: 10 }),
    skipKey: true,
    headers: serviceHeaders,
  });
  return (Array.isArray(created) && created[0]) ? (created[0].points ?? 10) : 10;
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

// ===== 壁纸数据 =====
const R2 = "https://pub-47bcb2d7ff1d4d90b554d3cc5a254b57.r2.dev";

const staticWallpapers = [
  // Anime
  { id: 1, src: R2 + "/wallpapers/08e1d3b2e2bf7ebf0e574b2118872a31.jpg", category: "anime", label: "Anime Girl", section: "static", free: true },
  { id: 2, src: R2 + "/wallpapers/b96001ef8c893fcceb691c77c3e5ba25.jpg", category: "anime", label: "Anime Art", section: "static", free: true },
  { id: 3, src: R2 + "/wallpapers/8cb6ea8e2cdf5be5687afba72243be85.jpg", category: "anime", label: "Anime Style", section: "static", free: true },
  // Cyberpunk
  { id: 4, src: R2 + "/wallpapers/86e87f5620a8f5e5e5c82ba0a04f864e.jpg", category: "cyberpunk", label: "Cyberpunk City", section: "static", free: true },
  { id: 5, src: R2 + "/wallpapers/2ccca866ca5b0f75f6c0225a22c5afec.jpg", category: "cyberpunk", label: "Neon City", section: "static", free: true },
  { id: 6, src: R2 + "/wallpapers/6cd06135791c43e867a94a607e3d5030.jpg", category: "cyberpunk", label: "Night City", section: "static", free: true },
  { id: 7, src: R2 + "/wallpapers/db297c2817881b195ceb82db0f3c06d2.jpg", category: "cyberpunk", label: "Neon Lights", section: "static", free: true },
  { id: 8, src: R2 + "/wallpapers/87581c5fade4564d30c46c68b5af2b6b.jpg", category: "cyberpunk", label: "Cyber Streets", section: "static", free: true },
  { id: 9, src: R2 + "/wallpapers/9785881c6386c4d3bdfa606bdd83ad5b.jpg", category: "cyberpunk", label: "Synthwave", section: "static", free: true },
  // Nature
  { id: 10, src: R2 + "/wallpapers/04668af86f5badd3a0577e01b032f6ae.jpg", category: "nature", label: "Nature View", section: "static", free: true },
  { id: 11, src: R2 + "/wallpapers/730d29ef123da817c86f749cfe20365a.jpg", category: "nature", label: "Scenery", section: "static", free: true },
  { id: 12, src: R2 + "/wallpapers/fa3461e7bba5f6f176bd34ff779f3e97.jpg", category: "nature", label: "Landscape", section: "static", free: true },
  // Minimal
  { id: 13, src: R2 + "/wallpapers/24f3da1a16ce8e294fa5d627d9d964dc.jpg", category: "minimal", label: "Clean Look", section: "static", free: true },
  { id: 14, src: R2 + "/wallpapers/e87b72ef0e8c67eaacaa1c0a6b5f5a05.jpg", category: "minimal", label: "Minimal Art", section: "static", free: true },
  { id: 15, src: R2 + "/wallpapers/ada4b291c9498275673b43ef61a871d2.jpg", category: "minimal", label: "Simple Style", section: "static", free: true },
];

const liveWallpapers = [
  { id: 101, src: R2 + "/wallpapers/08e1d3b2e2bf7ebf0e574b2118872a31.jpg", category: "live", label: "Ocean Waves Live", section: "live", free: false, points: 20 },
  { id: 102, src: R2 + "/wallpapers/86e87f5620a8f5e5e5c82ba0a04f864e.jpg", category: "live", label: "Neon Pulse Live", section: "live", free: false, points: 20 },
  { id: 103, src: R2 + "/wallpapers/04668af86f5badd3a0577e01b032f6ae.jpg", category: "live", label: "Galaxy Flow Live", section: "live", free: false, points: 20 },
];

// AI 自定义壁纸（每张包含静态图 + 样板视频）
const aiWallpapers = [
  { id: 201, src: R2 + "/wallpapers/08e1d3b2e2bf7ebf0e574b2118872a31.jpg", videoUrl: "", category: "custom", label: "Anime Style Live", section: "custom", free: false, points: 20 },
  { id: 202, src: R2 + "/wallpapers/86e87f5620a8f5e5e5c82ba0a04f864e.jpg", videoUrl: "", category: "custom", label: "Cyberpunk Live", section: "custom", free: false, points: 20 },
  { id: 203, src: R2 + "/wallpapers/04668af86f5badd3a0577e01b032f6ae.jpg", videoUrl: "", category: "custom", label: "Nature Live", section: "custom", free: false, points: 20 },
];

// ===== 状态 =====
let currentSection = "static";
let currentCategory = "all";
let currentSearch = "";
let userPoints = 10;
let extraWallpapers = [];
let extraIdCounter = 1000;

const r2Pool = [
  "08e1d3b2e2bf7ebf0e574b2118872a31", "b96001ef8c893fcceb691c77c3e5ba25", "8cb6ea8e2cdf5be5687afba72243be85",
  "86e87f5620a8f5e5e5c82ba0a04f864e", "2ccca866ca5b0f75f6c0225a22c5afec", "6cd06135791c43e867a94a607e3d5030",
  "db297c2817881b195ceb82db0f3c06d2", "87581c5fade4564d30c46c68b5af2b6b", "9785881c6386c4d3bdfa606bdd83ad5b",
  "04668af86f5badd3a0577e01b032f6ae", "730d29ef123da817c86f749cfe20365a", "fa3461e7bba5f6f176bd34ff779f3e97",
  "24f3da1a16ce8e294fa5d627d9d964dc", "e87b72ef0e8c67eaacaa1c0a6b5f5a05", "ada4b291c9498275673b43ef61a871d2",
];

// ===== DOM 元素 =====
const grid = document.getElementById("wallpaperGrid");
const navLinks = document.querySelectorAll(".nav-link");
const sectionTabs = document.querySelectorAll(".section-tab");
const searchInput = document.getElementById("searchInput");
const loadMoreBtn = document.getElementById("loadMore");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxRes = document.getElementById("lightboxRes");
const lightboxClose = document.getElementById("lightboxClose");
const btnDownload = document.getElementById("btnDownload");
const btnSetWallpaper = document.getElementById("btnSetWallpaper");
const menuToggle = document.getElementById("menuToggle");
const navEl = document.getElementById("mainNav");
const pointsBar = document.getElementById("pointsBar");
const pointsDisplay = document.getElementById("pointsDisplay");
const btnBuyPoints = document.getElementById("btnBuyPoints");
const pointsToast = document.getElementById("pointsToast");
const purchaseModal = document.getElementById("purchaseModal");
const purchaseModalClose = document.getElementById("purchaseModalClose");

// AI 自定义弹窗
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

// ===== 数据获取 =====
function getSectionData() {
  if (currentSection === "static") return staticWallpapers.concat(extraWallpapers.filter(w => w.section === "static"));
  if (currentSection === "live") return liveWallpapers.concat(extraWallpapers.filter(w => w.section === "live"));
  if (currentSection === "custom") return aiWallpapers.concat(extraWallpapers.filter(w => w.section === "custom"));
  return [];
}

function getFilteredData() {
  let data = getSectionData();
  if (currentCategory !== "all") {
    data = data.filter(item => item.category === currentCategory);
  }
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    data = data.filter(item => item.label.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  }
  return data;
}

// ===== 渲染卡片 =====
function renderCards(data) {
  grid.innerHTML = "";
  if (data.length === 0) {
    grid.innerHTML = '<p style="text-align:center;color:#777;grid-column:1/-1;padding:60px 0;">No wallpapers found. Try a different search or category.</p>';
    return;
  }
  data.forEach(item => {
    const card = document.createElement("div");

    let badgeHTML = "";
    let extraClass = "";
    if (item.section === "custom") {
      badgeHTML = '<span class="card-badge badge-points">20P</span><span class="card-badge-dynamic">Live</span>';
      extraClass = " card-dynamic";
    } else if (item.free === false) {
      badgeHTML = `<span class="card-badge badge-points">${item.points}P</span>`;
    } else {
      badgeHTML = '<span class="card-badge badge-free">Free</span>';
    }

    card.className = "wallpaper-card" + extraClass;
    if (item.section === "custom" && item.videoUrl) {
      card.innerHTML = `
        <video src="${item.videoUrl}#t=0,2" autoplay muted loop playsinline poster="${item.src}"></video>
        <span class="card-label">${item.label}</span>
        ${badgeHTML}
      `;
    } else {
      card.innerHTML = `
        <img src="${item.src}" alt="${item.label}" loading="lazy">
        <span class="card-label">${item.label}</span>
        ${badgeHTML}
      `;
    }
    card.addEventListener("click", () => {
      if (item.section === "custom") {
        openCompareModal(item);
      } else {
        openLightbox(item);
      }
    });
    grid.appendChild(card);
  });
}

// ===== 板块切换 =====
sectionTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    sectionTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentSection = tab.dataset.section;

    if (currentSection === "live" || currentSection === "custom") {
      pointsBar.style.display = "flex";
    } else {
      pointsBar.style.display = "none";
    }

    if (currentSection === "custom") {
      aiUploadArea.style.display = "block";
    } else {
      aiUploadArea.style.display = "none";
    }

    applyFilter();
  });
});

// ===== 分类切换 =====
navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navLinks.forEach(l => l.classList.remove("active"));
    link.classList.add("active");
    currentCategory = link.dataset.category;
    applyFilter();
  });
});

// ===== 搜索 =====
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

// ===== 加载更多 =====
loadMoreBtn.addEventListener("click", () => {
  const categories = ["nature", "anime", "cyberpunk", "minimal"];
  const count = currentSection === "live" || currentSection === "custom" ? 4 : 8;
  for (let i = 0; i < count; i++) {
    const hash = r2Pool[Math.floor(Math.random() * r2Pool.length)];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    extraWallpapers.push({
      id: Date.now() + i,
      src: R2 + "/wallpapers/" + hash + ".jpg",
      category: cat,
      label: label,
      section: currentSection,
      free: currentSection === "static",
      points: currentSection === "live" ? 20 : currentSection === "custom" ? 20 : 0,
      videoUrl: "",
    });
  }
  applyFilter();
});

// ===== 普通弹窗（静态/动态板块） =====
function openLightbox(item) {
  // 允许查看，但如果要下载积分内容需要登录
  if (item.free === false && !currentUser) {
    showAuthModal("login");
    return;
  }
  if (item.free === false && userPoints < item.points) {
    showPurchaseModal();
    return;
  }
  lightboxImg.src = item.src;
  lightboxImg.alt = item.label;
  lightboxRes.textContent = "1080 x 1920  ·  Phone";
  lightbox.dataset.currentSrc = item.src;
  lightbox.dataset.currentLabel = item.label;
  lightbox.dataset.currentPoints = item.points || 0;
  lightbox.dataset.currentFree = item.free ? "1" : "0";
  lightbox.classList.add("show");
  document.body.style.overflow = "hidden";

  if (item.free === false) {
    btnDownload.textContent = "Download (" + item.points + " pts)";
    btnSetWallpaper.style.display = "inline-flex";
  } else {
    btnDownload.textContent = "Download";
    btnSetWallpaper.style.display = "none";
  }
}

function closeLightbox() {
  lightbox.classList.remove("show");
  document.body.style.overflow = "";
}
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

btnDownload.addEventListener("click", async () => {
  const src = lightbox.dataset.currentSrc;
  const label = lightbox.dataset.currentLabel || "wallpaper";
  const points = parseInt(lightbox.dataset.currentPoints) || 0;
  const free = lightbox.dataset.currentFree === "1";
  if (!free && !currentUser) { showAuthModal("login"); return; }
  if (!free && userPoints < points) { showPurchaseModal(); return; }
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = label.replace(/\s+/g, "-").toLowerCase() + ".jpg";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (!free) { await updatePointsToDB(userPoints - points); await logTransaction("generation", -points, "Download: " + label); showToast("Downloaded! " + points + " pts used."); }
  } catch { window.open(src, "_blank"); }
});

btnSetWallpaper.addEventListener("click", () => {
  showToast("Long-press the image and save, then set as wallpaper in phone settings.");
});

// ===== AI 自定义对比弹窗 =====
function openCompareModal(item) {
  currentCustomItem = item;
  // 左：静态图
  if (item.src) {
    compareImg.src = item.src;
    compareImg.style.display = "block";
    comparePlaceholder.style.display = "none";
  } else {
    compareImg.src = "";
    compareImg.style.display = "none";
    comparePlaceholder.style.display = "flex";
  }
  // 右：动态结果
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

// 删除：清空静态图，显示 + 号
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

// 下载视频
compareDownload.addEventListener("click", () => {
  if (compareVideo.src) {
    window.open(compareVideo.src, "_blank");
  }
});

// 生成
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
    const submitResp = await fetch("/api/generate-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: currentCustomItem.src }),
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
        userPoints += 20; updatePointsDisplay();
        break;
      }
    }
  } catch (err) {
    compareStatusText.textContent = "Error: " + err.message;
    compareBtnGenerate.style.display = "inline-block";
    userPoints += 20; await updatePointsToDB(userPoints);
  }
});

// ===== 文件上传到 R2 =====
async function uploadFileToR2(file) {
  const formData = new FormData();
  formData.append("file", file);
  const resp = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await resp.json();
  if (!data.success) throw new Error(data.error || "Upload failed");
  return data.url;
}

// AI Custom 页面：选文件上传
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

// 对比弹窗中：上传替换静态图
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

// ===== 积分系统 =====
const headerPointsDisplay = document.getElementById("headerPointsDisplay");

function updatePointsDisplay() {
  pointsDisplay.textContent = userPoints;
  headerPointsDisplay.textContent = userPoints;
}

function showPurchaseModal() {
  purchaseModal.classList.add("show");
  document.body.style.overflow = "hidden";
}

btnBuyPoints.addEventListener("click", showPurchaseModal);
document.querySelectorAll("#btnBuyPoints").forEach(b => {
  if (b !== btnBuyPoints) b.addEventListener("click", showPurchaseModal);
});

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

// ===== 手机菜单 =====
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

// ===== 登录/注册 =====
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
}

// 登录/注册提交
authBtnSubmit.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();
  if (!email || !password) { showToast("Please fill in email and password."); return; }
  try {
    if (authMode === "signup") {
      const r = await signupUser(email, password);
      if (r.error || r.error_description) { showToast("Error: " + (r.error_description || r.error)); return; }
      if (r.id || r.user?.id) {
        // 自动登录
        await loginUser(email, password);
        // 手动创建 profile（service key 绕过 RLS）
        try { userPoints = await ensureUserProfile(); } catch {}
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

// 切换登录/注册
authToggle.addEventListener("click", (e) => {
  e.preventDefault();
  setAuthMode(authMode === "login" ? "signup" : "login");
});

// 打开登录弹窗
btnLogin.addEventListener("click", () => showAuthModal("login"));

// 退出
btnLogout.addEventListener("click", () => {
  logoutUser();
  updateAuthUI(null);
  showToast("Logged out.");
});

// 关闭弹窗
authModalClose.addEventListener("click", hideAuthModal);
authModal.addEventListener("click", (e) => { if (e.target === authModal) hideAuthModal(); });

// 页面加载：壁纸立即可见，登录异步恢复
updatePointsDisplay();
renderCards(staticWallpapers);

if (currentUser) {
  updateAuthUI(currentUser);
  fetchPoints().then(pts => {
    userPoints = pts;
    updatePointsDisplay();
  });
}
