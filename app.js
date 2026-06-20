// ════════════════════════════════════════
//  app.js — واجهة العرض العامة (index.html)
// ════════════════════════════════════════

import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, collection,
         query, orderBy, onSnapshot }            from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig }                         from "./firebase-config.js";

// ── Init ──
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── DOM refs ──
const avatarWrap  = document.getElementById("avatar-wrap");
const avatarImg   = document.getElementById("avatar-img");
const avatarInit  = document.getElementById("avatar-initials");
const profileName = document.getElementById("profile-name");
const profileBio  = document.getElementById("profile-bio");
const linksList   = document.getElementById("links-list");

// ── Load Profile ──
async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "settings", "profile"));
    if (!snap.exists()) return;

    const data = snap.data();

    // Remove skeletons
    profileName.classList.remove("skeleton-text");
    profileBio.classList.remove("skeleton-text");
    avatarWrap.classList.remove("skeleton");

    profileName.textContent = data.name  || "Remlex";
    profileBio.textContent  = data.bio   || "";

    if (data.avatarUrl) {
      avatarImg.src             = data.avatarUrl;
      avatarImg.style.display   = "block";
      avatarInit.style.display  = "none";
    } else {
      const initials = (data.name || "R").slice(0, 2).toUpperCase();
      avatarInit.textContent   = initials;
      avatarInit.style.display = "block";
    }

    document.title = `${data.name || "Remlex"} — Link in Bio`;
  } catch (err) {
    console.error("خطأ في تحميل الملف الشخصي:", err);
  }
}

// ── Load Links (real-time) ──
function loadLinks() {
  const q = query(
    collection(db, "links"),
    orderBy("order", "asc")
  );

  onSnapshot(q, (snapshot) => {
    linksList.innerHTML = "";

    if (snapshot.empty) {
      linksList.innerHTML = `<li class="empty-state">لا توجد روابط بعد.</li>`;
      return;
    }

    snapshot.forEach((docSnap, i) => {
      const d  = docSnap.data();
      const li = document.createElement("li");
      li.className = "link-item";
      li.style.animationDelay = `${0.05 + i * 0.07}s`;

      li.innerHTML = `
        <a href="${escapeHtml(d.url)}" target="_blank" rel="noopener noreferrer">
          <span class="link-icon">${escapeHtml(d.icon || "🔗")}</span>
          <span>${escapeHtml(d.title)}</span>
        </a>`;

      linksList.appendChild(li);
    });
  });
}

// ── Helper: Escape HTML ──
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──
loadProfile();
loadLinks();
