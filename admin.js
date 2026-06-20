// ════════════════════════════════════════
//  admin.js — Advanced Admin Panel
//  Auth + Firestore + Storage
// ════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

let unsubscribeLinks = null;
let avatarObjectUrl = "";

const linkMap = new Map();

const refs = {
  authScreen: document.getElementById("auth-screen"),
  dashboard: document.getElementById("dashboard"),

  emailInput: document.getElementById("email"),
  passwordInput: document.getElementById("password"),
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  authError: document.getElementById("auth-error"),

  pName: document.getElementById("p-name"),
  pBio: document.getElementById("p-bio"),
  pAvatar: document.getElementById("p-avatar"),
  pAvatarFile: document.getElementById("p-avatar-file"),
  avatarPreview: document.getElementById("avatar-preview"),
  pAccent: document.getElementById("p-accent"),
  pBgTop: document.getElementById("p-bg-top"),
  pBgBottom: document.getElementById("p-bg-bottom"),
  saveProfileBtn: document.getElementById("save-profile-btn"),
  profileSuccess: document.getElementById("profile-success"),
  uploadStatus: document.getElementById("upload-status"),

  linkTitle: document.getElementById("link-title"),
  linkUrl: document.getElementById("link-url"),
  linkIcon: document.getElementById("link-icon"),
  linkNeon: document.getElementById("link-neon"),
  linkVisible: document.getElementById("link-visible"),
  addLinkBtn: document.getElementById("add-link-btn"),
  linkError: document.getElementById("link-error"),

  refreshLinksBtn: document.getElementById("refresh-links-btn"),
  adminList: document.getElementById("admin-links-list"),

  modalOverlay: document.getElementById("modal-overlay"),
  editId: document.getElementById("edit-id"),
  editTitle: document.getElementById("edit-title"),
  editUrl: document.getElementById("edit-url"),
  editIcon: document.getElementById("edit-icon"),
  editNeon: document.getElementById("edit-neon"),
  editVisible: document.getElementById("edit-visible"),
  saveEditBtn: document.getElementById("save-edit-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  editError: document.getElementById("edit-error")
};

/* ── Auth ── */

onAuthStateChanged(auth, (user) => {
  if (user) {
    refs.authScreen.hidden = true;
    refs.dashboard.hidden = false;

    loadProfile();
    listenLinks();
  } else {
    refs.authScreen.hidden = true;
    refs.dashboard.hidden = true;

    unsubscribeLinks?.();
    unsubscribeLinks = null;
    refs.adminList.replaceChildren();
  }
});

refs.loginBtn.addEventListener("click", handleLogin);

[refs.emailInput, refs.passwordInput].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });
});

refs.logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(`خطأ في الخروج: ${error.message}`);
  }
});

async function handleLogin() {
  if (refs.loginBtn.disabled) return;

  refs.authError.textContent = "";

  const email = refs.emailInput.value.trim();
  const password = refs.passwordInput.value;

  if (!email || !password) {
    refs.authError.textContent = "يرجى إدخال البريد وكلمة المرور.";
    return;
  }

  refs.loginBtn.disabled = true;
  refs.loginBtn.textContent = "جاري الدخول…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    refs.authError.textContent = friendlyAuthError(error.code);
  } finally {
    refs.loginBtn.disabled = false;
    refs.loginBtn.textContent = "دخول";
  }
}

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة، حاول لاحقاً.",
    "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة."
  };

  return map[code] || "حدث خطأ، حاول مجدداً.";
}

/* ── Profile ── */

refs.pAvatar.addEventListener("input", refreshAvatarPreview);
refs.pAvatarFile.addEventListener("change", refreshAvatarPreview);
refs.saveProfileBtn.addEventListener("click", saveProfile);

async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "settings", "profile"));

    if (snap.exists()) {
      const d = snap.data();

      refs.pName.value = d.name || "";
      refs.pBio.value = d.bio || "";
      refs.pAvatar.value = d.avatarUrl || "";
      refs.pAccent.value = normalizeHex(d.accentColor) || "#3b82f6";
      refs.pBgTop.value = normalizeHex(d.bgTop) || "#081120";
      refs.pBgBottom.value = normalizeHex(d.bgBottom) || "#02040a";
    } else {
      refs.pName.value = "Remlex";
      refs.pBio.value = "";
      refs.pAvatar.value = "";
      refs.pAccent.value = "#3b82f6";
      refs.pBgTop.value = "#081120";
      refs.pBgBottom.value = "#02040a";
    }

    refreshAvatarPreview();
  } catch (error) {
    console.error("خطأ في جلب الملف الشخصي:", error);
  }
}

function refreshAvatarPreview() {
  const file = refs.pAvatarFile.files && refs.pAvatarFile.files[0];

  if (file) {
    if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl);

    avatarObjectUrl = URL.createObjectURL(file);
    refs.avatarPreview.src = avatarObjectUrl;
    refs.avatarPreview.hidden = false;
    return;
  }

  const url = refs.pAvatar.value.trim();

  if (url) {
    refs.avatarPreview.src = url;
    refs.avatarPreview.hidden = false;
  } else {
    refs.avatarPreview.removeAttribute("src");
    refs.avatarPreview.hidden = true;
  }
}

async function saveProfile() {
  refs.profileSuccess.textContent = "";
  refs.profileSuccess.style.color = "";
  refs.uploadStatus.textContent = "";
  refs.uploadStatus.style.color = "";

  const file = refs.pAvatarFile.files && refs.pAvatarFile.files[0];
  let avatarUrl = refs.pAvatar.value.trim();

  refs.saveProfileBtn.disabled = true;
  refs.saveProfileBtn.textContent = "جاري الحفظ…";

  if (file) {
    try {
      refs.uploadStatus.textContent = "جاري رفع الصورة…";
      avatarUrl = await uploadAvatar(file);

      refs.uploadStatus.style.color = "var(--success)";
      refs.uploadStatus.textContent = "✓ تم رفع الصورة بنجاح.";
    } catch (error) {
      refs.profileSuccess.style.color = "var(--danger)";
      refs.profileSuccess.textContent = `خطأ في رفع الصورة: ${error.message}`;

      refs.saveProfileBtn.disabled = false;
      refs.saveProfileBtn.textContent = "حفظ الملف الشخصي والثيم";
      return;
    }
  }

  try {
    await setDoc(
      doc(db, "settings", "profile"),
      {
        name: refs.pName.value.trim() || "Remlex",
        bio: refs.pBio.value.trim(),
        avatarUrl,
        accentColor: normalizeHex(refs.pAccent.value) || "#3b82f6",
        bgTop: normalizeHex(refs.pBgTop.value) || "#081120",
        bgBottom: normalizeHex(refs.pBgBottom.value) || "#02040a",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    refs.profileSuccess.style.color = "var(--success)";
    refs.profileSuccess.textContent = "✓ تم حفظ الملف الشخصي والثيم.";

    refs.pAvatarFile.value = "";
    refreshAvatarPreview();

    setTimeout(() => {
      refs.profileSuccess.textContent = "";
      refs.uploadStatus.textContent = "";
    }, 3000);
  } catch (error) {
    refs.profileSuccess.style.color = "var(--danger)";
    refs.profileSuccess.textContent = `خطأ في الحفظ: ${error.message}`;
  } finally {
    refs.saveProfileBtn.disabled = false;
    refs.saveProfileBtn.textContent = "حفظ الملف الشخصي والثيم";
  }
}

async function uploadAvatar(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("اختر ملف صورة فقط.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("حجم الصورة يجب أن يكون أقل من 2MB.");
  }

  const safeName = sanitizeFileName(file.name);
  const fileRef = ref(storage, `avatars/profile-${Date.now()}-${safeName}`);

  await uploadBytes(fileRef, file, {
    contentType: file.type,
    cacheControl: "public, max-age=31536000"
  });

  return getDownloadURL(fileRef);
}

/* ── Add Link ── */

refs.addLinkBtn.addEventListener("click", addLink);

async function addLink() {
  refs.linkError.textContent = "";

  const title = refs.linkTitle.value.trim();
  const url = normalizeUrl(refs.linkUrl.value);
  const icon = refs.linkIcon.value.trim() || "🔗";
  const neonColor = normalizeHex(refs.linkNeon.value) || "#3b82f6";
  const visible = refs.linkVisible.checked;

  if (!title) {
    refs.linkError.textContent = "يرجى إدخال العنوان.";
    return;
  }

  if (!url) {
    refs.linkError.textContent = "الرابط غير صحيح. استخدم https:// أو http://.";
    return;
  }

  refs.addLinkBtn.disabled = true;
  refs.addLinkBtn.textContent = "جاري الإضافة…";

  try {
    await addDoc(collection(db, "links"), {
      title,
      url,
      icon,
      neonColor,
      visible,
      order: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    refs.linkTitle.value = "";
    refs.linkUrl.value = "";
    refs.linkIcon.value = "🔗";
    refs.linkNeon.value = "#3b82f6";
    refs.linkVisible.checked = true;
  } catch (error) {
    refs.linkError.textContent = `خطأ في الإضافة: ${error.message}`;
  } finally {
    refs.addLinkBtn.disabled = false;
    refs.addLinkBtn.textContent = "إضافة الرابط";
  }
}

/* ── Listen Links ── */

refs.refreshLinksBtn.addEventListener("click", listenLinks);
refs.adminList.addEventListener("click", handleAdminListClick);

function listenLinks() {
  if (unsubscribeLinks) unsubscribeLinks();

  const q = query(collection(db, "links"), orderBy("order", "asc"));

  refs.adminList.innerHTML = `<li class="empty-state">جاري التحميل…</li>`;

  unsubscribeLinks = onSnapshot(
    q,
    (snapshot) => {
      linkMap.clear();

      snapshot.docs.forEach((docSnap) => {
        linkMap.set(docSnap.id, {
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      refs.adminList.replaceChildren();

      if (!linkMap.size) {
        refs.adminList.innerHTML = `<li class="empty-state">لا توجد روابط بعد. أضف أول رابط أعلاه.</li>`;
        return;
      }

      linkMap.forEach((link) => renderAdminLink(link));
    },
    (error) => {
      console.error("خطأ في تحميل الروابط:", error);
      refs.adminList.innerHTML = `<li class="empty-state">تعذر تحميل الروابط: ${escapeHtml(error.message)}</li>`;
    }
  );
}

function renderAdminLink(link) {
  const visible = link.visible !== false;
  const neonColor = normalizeHex(link.neonColor) || "#3b82f6";
  const title = link.title || "رابط غير معنون";
  const url = link.url || "";
  const icon = link.icon || "🔗";

  const li = document.createElement("li");
  li.className = `admin-link-item${visible ? "" : " is-disabled"}`;
  li.style.setProperty("--link-neon", neonColor);

  li.innerHTML = `
    <span class="admin-link-icon">${escapeHtml(icon)}</span>

    <div class="admin-link-info">
      <div class="admin-link-title">${escapeHtml(title)}</div>
      <div class="admin-link-url" title="${escapeHtml(url)}">${escapeHtml(url)}</div>

      <div class="admin-link-meta">
        <span>${visible ? "ظاهر" : "مخفي"}</span>
        <span>Neon ${escapeHtml(neonColor)}</span>
      </div>
    </div>

    <div class="admin-link-actions">
      <button
        class="btn btn-toggle"
        type="button"
        data-action="toggle"
        data-id="${escapeHtml(link.id)}"
      >
        ${visible ? "تعطيل" : "تفعيل"}
      </button>

      <button
        class="btn btn-edit"
        type="button"
        data-action="edit"
        data-id="${escapeHtml(link.id)}"
      >
        تعديل
      </button>

      <button
        class="btn btn-danger"
        type="button"
        data-action="delete"
        data-id="${escapeHtml(link.id)}"
      >
        حذف
      </button>
    </div>
  `;

  refs.adminList.append(li);
}

async function handleAdminListClick(event) {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest("button[data-action]");
  if (!button || !refs.adminList.contains(button)) return;

  const { action, id } = button.dataset;
  if (!id) return;

  if (action === "edit") {
    const link = linkMap.get(id);
    if (link) openEdit(id, link);
    return;
  }

  if (action === "delete") {
    const link = linkMap.get(id);
    await deleteLink(id, link);
    return;
  }

  if (action === "toggle") {
    await toggleLink(id);
  }
}

async function toggleLink(id) {
  const link = linkMap.get(id);
  if (!link) return;

  try {
    await updateDoc(doc(db, "links", id), {
      visible: link.visible === false,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    alert(`خطأ في التبديل: ${error.message}`);
  }
}

async function deleteLink(id, link) {
  const title = link?.title || "هذا الرابط";

  if (!confirm(`هل تريد حذف "${title}"؟`)) return;

  try {
    await deleteDoc(doc(db, "links", id));
  } catch (error) {
    alert(`خطأ في الحذف: ${error.message}`);
  }
}

/* ── Edit Modal ── */

refs.saveEditBtn.addEventListener("click", saveEdit);
refs.cancelEditBtn.addEventListener("click", closeModal);

refs.modalOverlay.addEventListener("click", (event) => {
  if (event.target === refs.modalOverlay) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !refs.modalOverlay.hidden) {
    closeModal();
  }
});

function openEdit(id, data) {
  refs.editId.value = id;
  refs.editTitle.value = data.title || "";
  refs.editUrl.value = data.url || "";
  refs.editIcon.value = data.icon || "🔗";
  refs.editNeon.value = normalizeHex(data.neonColor) || "#3b82f6";
  refs.editVisible.checked = data.visible !== false;
  refs.editError.textContent = "";

  refs.modalOverlay.hidden = false;
  document.body.style.overflow = "hidden";

  setTimeout(() => refs.editTitle.focus(), 50);
}

function closeModal() {
  refs.modalOverlay.hidden = true;
  document.body.style.overflow = "";
}

async function saveEdit() {
  refs.editError.textContent = "";

  const id = refs.editId.value;
  const title = refs.editTitle.value.trim();
  const url = normalizeUrl(refs.editUrl.value);
  const icon = refs.editIcon.value.trim() || "🔗";
  const neonColor = normalizeHex(refs.editNeon.value) || "#3b82f6";
  const visible = refs.editVisible.checked;

  if (!id) return;

  if (!title) {
    refs.editError.textContent = "يرجى إدخال العنوان.";
    return;
  }

  if (!url) {
    refs.editError.textContent = "الرابط غير صحيح. استخدم https:// أو http://.";
    return;
  }

  refs.saveEditBtn.disabled = true;
  refs.saveEditBtn.textContent = "جاري الحفظ…";

  try {
    await updateDoc(doc(db, "links", id), {
      title,
      url,
      icon,
      neonColor,
      visible,
      updatedAt: serverTimestamp()
    });

    closeModal();
  } catch (error) {
    refs.editError.textContent = `خطأ في التعديل: ${error.message}`;
  } finally {
    refs.saveEditBtn.disabled = false;
    refs.saveEditBtn.textContent = "حفظ";
  }
}

/* ── Helpers ── */

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

function escapeHtml(value = "") {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };

  return String(value ?? "").replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeFileName(name) {
  const safe = String(name || "avatar.png")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);

  return safe || "avatar.png";
}
