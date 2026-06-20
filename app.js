// ════════════════════════════════════════
//  app.js — Public Portfolio
//  Reads profile + links from Firestore
// ════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const refs = {
  avatarWrap: document.getElementById("avatar-wrap"),
  avatarImg: document.getElementById("avatar-img"),
  avatarInitials: document.getElementById("avatar-initials"),
  profileName: document.getElementById("profile-name"),
  profileBio: document.getElementById("profile-bio"),
  linksList: document.getElementById("links-list"),
  currentYear: document.getElementById("current-year")
};

const defaults = {
  name: "Remlex",
  bio: "PC Performance • Gaming Optimization",
  avatarUrl: "",
  accentColor: "#3b82f6",
  bgTop: "#081120",
  bgBottom: "#02040a"
};

refs.currentYear.textContent = new Date().getFullYear();

refs.linksList.addEventListener("pointermove", (event) => {
  if (!(event.target instanceof Element)) return;

  const card = event.target.closest(".link-card");
  if (!card) return;

  const rect = card.getBoundingClientRect();

  card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
  card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
});

loadProfile();
listenLinks();

async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "settings", "profile"));
    const profile = {
      ...defaults,
      ...(snap.exists() ? snap.data() : {})
    };

    applyTheme(profile);
    renderProfile(profile);
  } catch (error) {
    console.error("خطأ في تحميل الملف الشخصي:", error);

    applyTheme(defaults);
    renderProfile(defaults);
  }
}

function renderProfile(profile) {
  refs.avatarWrap.classList.remove("skeleton");
  refs.profileName.classList.remove("skeleton-text");
  refs.profileBio.classList.remove("skeleton-text");

  const name = profile.name || "Remlex";
  const bio = profile.bio || "PC Performance • Gaming Optimization";
  const avatarUrl = normalizeUrl(profile.avatarUrl || "");

  refs.profileName.textContent = name;
  refs.profileBio.textContent = bio;
  document.title = `${name} — Link in Bio`;

  if (avatarUrl) {
    refs.avatarImg.src = avatarUrl;
    refs.avatarImg.style.display = "block";
    refs.avatarInitials.hidden = true;
  } else {
    refs.avatarImg.removeAttribute("src");
    refs.avatarImg.style.display = "none";
    refs.avatarInitials.hidden = false;
    refs.avatarInitials.textContent = createInitials(name);
  }
}

function applyTheme(profile) {
  const accent = normalizeHex(profile.accentColor) || "#3b82f6";

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-soft", hexToRgba(accent, 0.18));
  document.documentElement.style.setProperty("--bg-top", normalizeHex(profile.bgTop) || "#081120");
  document.documentElement.style.setProperty("--bg-bottom", normalizeHex(profile.bgBottom) || "#02040a");
}

function listenLinks() {
  const q = query(collection(db, "links"), orderBy("order", "asc"));

  onSnapshot(
    q,
    (snapshot) => {
      renderLinks(snapshot);
    },
    (error) => {
      console.error("خطأ في تحميل الروابط:", error);
      refs.linksList.innerHTML = `<li class="empty-state">تعذر تحميل الروابط.</li>`;
    }
  );
}

function renderLinks(snapshot) {
  refs.linksList.replaceChildren();

  const visibleLinks = snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .filter((link) => link.visible !== false);

  if (!visibleLinks.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "لا توجد روابط ظاهرة حالياً.";
    refs.linksList.append(li);
    return;
  }

  visibleLinks.forEach((link, index) => {
    const item = createLinkElement(link, index);
    if (item) refs.linksList.append(item);
  });
}

function createLinkElement(link, index) {
  const url = normalizeUrl(link.url);
  if (!url) return null;

  const li = document.createElement("li");
  li.className = "link-item";
  li.style.animationDelay = `${0.04 + index * 0.055}s`;

  const accent =
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3b82f6";

  const a = document.createElement("a");
  a.className = "link-card";
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.setProperty("--link-neon", normalizeHex(link.neonColor) || accent);

  const icon = document.createElement("span");
  icon.className = "link-icon";
  icon.textContent = link.icon || "🔗";

  const text = document.createElement("span");
  text.className = "link-text";

  const title = document.createElement("span");
  title.className = "link-title";
  title.textContent = link.title || "رابط";

  const meta = document.createElement("span");
  meta.className = "link-meta";
  meta.textContent = "Open link";

  text.append(title, meta);
  a.append(icon, text);
  li.append(a);

  return li;
}

function createInitials(name) {
  return String(name || "R")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "R";
}

function normalizeHex(value) {
  const str = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(str)) {
    return str.toLowerCase();
  }

  const short = str.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }

  return "";
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeHex(hex) || "#3b82f6";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();

  try {
    const url = new URL(raw);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

    return allowedProtocols.includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
