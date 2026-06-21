// ════════════════════════════════════════
//  admin.js — Remlex Admin Panel
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

const linkMap = new Map();

// ── Auth State ──
onAuthStateChanged(auth, (user) => {
  if (user) {
    refs.authScreen.hidden = true;
    refs.dashboard.hidden = false;
    loadProfile();
    listenLinks();
  } else {
    refs.authScreen.hidden = false;
    refs.dashboard.hidden = true;
    if (unsubscribeLinks) unsubscribeLinks();
    linkMap.clear();
    refs.adminList.innerHTML = "";
  }
});

// ── Login ──
refs.loginBtn.addEventListener("click", handleLogin);
[refs.emailInput, refs.passwordInput].forEach((el) =>
  el.addEventListener("keydown", (e) => e.key === "Enter" && handleLogin())
);

async function handleLogin() {
  refs.authError.textContent = "";
  const email = refs.emailInput.value.trim();
  const password = refs.passwordInput.value;

  if (!email || !password) {
    refs.authError.textContent = "يرجى إدخال البريد وكلمة المرور.";
    return;
  }

  refs.loginBtn.disabled = true;
  refs.loginBtn.textContent = "جاري الدخول...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    refs.authError.textContent = friendlyAuthError(error.code);
  } finally {
    refs.loginBtn.disabled = false;
    refs.loginBtn.textContent = "دخول";
  }
}

refs.logoutBtn.addEventListener("click", () => signOut(auth));

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email": "البريد غير صحيح.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة، حاول لاحقاً.",
    "auth/invalid-credential": "بيانات الدخول غير صحيحة."
  };
  return map[code] || "خطأ في الدخول.";
}

// ── Profile ──
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
    }
    refreshAvatarPreview();
  } catch (error) {
    console.error("خطأ في تحميل الملف الشخصي:", error);
  }
}

function refreshAvatarPreview() {
  const file = refs.pAvatarFile.files?.[0];
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
  refs.uploadStatus.textContent = "";

  const file = refs.pAvatarFile.files?.[0];
  let avatarUrl = refs.pAvatar.value.trim();

  refs.saveProfileBtn.disabled = true;
  refs.saveProfileBtn.textContent = "جاري الحفظ...";

  if (file) {
    try {
      refs.uploadStatus.textContent = "جاري رفع الصورة...";
      avatarUrl = await uploadAvatar(file);
      refs.uploadStatus.style.color = "var(--success)";
      refs.uploadStatus.textContent = "✓ تم رفع الصورة.";
    } catch (error) {
      refs.uploadStatus.style.color = "var(--danger)";
      refs.uploadStatus.textContent = `خطأ في رفع الصورة: ${error.message}`;
      refs.saveProfileBtn.disabled = false;
      refs.saveProfileBtn.textContent = "حفظ الملف الشخصي";
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
    refs.profileSuccess.textContent = "✓ تم الحفظ.";
    refs.pAvatarFile.value = "";
    refreshAvatarPreview();

    setTimeout(() => {
      refs.profileSuccess.textContent = "";
      refs.uploadStatus.textContent = "";
    }, 3000);
  } catch (error) {
    refs.profileSuccess.style.color = "var(--danger)";
    refs.profileSuccess.textContent = `خطأ: ${error.message}`;
  } finally {
    refs.saveProfileBtn.disabled = false;
    refs.saveProfileBtn.textContent = "حفظ الملف الشخصي";
  }
}

async function uploadAvatar(file) {
  if (!file.type.startsWith("image/")) throw new Error("اختر صورة فقط.");
  if (file.size > 2 * 1024 * 1024) throw new Error("الحد الأقصى 2MB.");

  const safeName = sanitizeFileName(file.name);
  const fileRef = ref(storage, `avatars/profile-${Date.now()}-${safeName}`);

  await uploadBytes(fileRef, file, {
    contentType: file.type,
    cacheControl: "public, max-age=31536000"
  });

  return getDownloadURL(fileRef);
}

// ── Add Link ──
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
    refs.linkError.textContent = "الرابط غير صحيح.";
    return;
  }

  refs.addLinkBtn.disabled = true;
  refs.addLinkBtn.textContent = "جاري الإضافة...";

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
    refs.linkError.textContent = `خطأ: ${error.message}`;
  } finally {
    refs.addLinkBtn.disabled = false;
    refs.addLinkBtn.textContent = "إضافة الرابط";
  }
}

// ── Listen Links ──
refs.adminList.addEventListener("click", handleAdminListClick);

function listenLinks() {
  if (
