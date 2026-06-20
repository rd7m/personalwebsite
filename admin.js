// ════════════════════════════════════════
//  admin.js — لوحة التحكم (admin.html)
// ════════════════════════════════════════

import { initializeApp }                                from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc,
         collection, query, orderBy, onSnapshot,
         addDoc, updateDoc, deleteDoc, serverTimestamp }
                                                        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword,
         onAuthStateChanged, signOut }                  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig }                               from "./firebase-config.js";

// ── Init ──
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── DOM refs ──
const authScreen     = document.getElementById("auth-screen");
const dashboard      = document.getElementById("dashboard");

// Auth
const emailInput     = document.getElementById("email");
const passwordInput  = document.getElementById("password");
const loginBtn       = document.getElementById("login-btn");
const logoutBtn      = document.getElementById("logout-btn");
const authError      = document.getElementById("auth-error");

// Profile
const pName          = document.getElementById("p-name");
const pBio           = document.getElementById("p-bio");
const pAvatar        = document.getElementById("p-avatar");
const saveProfileBtn = document.getElementById("save-profile-btn");
const profileSuccess = document.getElementById("profile-success");

// Add Link
const linkTitle      = document.getElementById("link-title");
const linkUrl        = document.getElementById("link-url");
const linkIcon       = document.getElementById("link-icon");
const addLinkBtn     = document.getElementById("add-link-btn");
const linkError      = document.getElementById("link-error");

// Admin List
const adminList      = document.getElementById("admin-links-list");

// Modal
const modalOverlay   = document.getElementById("modal-overlay");
const editId         = document.getElementById("edit-id");
const editTitle      = document.getElementById("edit-title");
const editUrl        = document.getElementById("edit-url");
const editIcon       = document.getElementById("edit-icon");
const saveEditBtn    = document.getElementById("save-edit-btn");
const cancelEditBtn  = document.getElementById("cancel-edit-btn");

// ══════════════════════════
//  AUTH
// ══════════════════════════
onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.hidden = true;
    dashboard.hidden  = false;
    loadProfile();
    listenLinks();
  } else {
    authScreen.hidden = false;
    dashboard.hidden  = true;
  }
});

loginBtn.addEventListener("click", async () => {
  authError.textContent = "";
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    authError.textContent = "يرجى إدخال البريد وكلمة المرور.";
    return;
  }

  loginBtn.disabled    = true;
  loginBtn.textContent = "جاري الدخول…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    authError.textContent = friendlyAuthError(err.code);
    loginBtn.disabled    = false;
    loginBtn.textContent = "دخول";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// ── Allow Enter key in auth fields ──
[emailInput, passwordInput].forEach(el =>
  el.addEventListener("keydown", e => { if (e.key === "Enter") loginBtn.click(); })
);

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email":          "البريد الإلكتروني غير صحيح.",
    "auth/user-not-found":         "لا يوجد حساب بهذا البريد.",
    "auth/wrong-password":         "كلمة المرور غير صحيحة.",
    "auth/too-many-requests":      "محاولات كثيرة، حاول لاحقاً.",
    "auth/invalid-credential":     "البريد أو كلمة المرور غير صحيحة.",
  };
  return map[code] || "حدث خطأ، حاول مجدداً.";
}

// ══════════════════════════
//  PROFILE
// ══════════════════════════
async function loadProfile() {
  try {
    const snap = await getDoc(doc(db, "settings", "profile"));
    if (snap.exists()) {
      const d    = snap.data();
      pName.value   = d.name      || "";
      pBio.value    = d.bio       || "";
      pAvatar.value = d.avatarUrl || "";
    }
  } catch (err) {
    console.error("خطأ في جلب الملف الشخصي:", err);
  }
}

saveProfileBtn.addEventListener("click", async () => {
  profileSuccess.textContent = "";
  saveProfileBtn.disabled    = true;

  try {
    await setDoc(doc(db, "settings", "profile"), {
      name:      pName.value.trim(),
      bio:       pBio.value.trim(),
      avatarUrl: pAvatar.value.trim(),
      updatedAt: serverTimestamp()
    });
    profileSuccess.textContent = "✓ تم حفظ الملف الشخصي.";
    setTimeout(() => profileSuccess.textContent = "", 3000);
  } catch (err) {
    profileSuccess.style.color = "var(--danger)";
    profileSuccess.textContent = "خطأ في الحفظ: " + err.message;
  } finally {
    saveProfileBtn.disabled = false;
  }
});

// ══════════════════════════
//  LINKS — Add
// ══════════════════════════
addLinkBtn.addEventListener("click", async () => {
  linkError.textContent = "";
  const title = linkTitle.value.trim();
  const url   = linkUrl.value.trim();
  const icon  = linkIcon.value.trim() || "🔗";

  if (!title) { linkError.textContent = "يرجى إدخال العنوان.";   return; }
  if (!url)   { linkError.textContent = "يرجى إدخال الرابط.";    return; }
  if (!isValidUrl(url)) { linkError.textContent = "الرابط غير صحيح."; return; }

  addLinkBtn.disabled    = true;
  addLinkBtn.textContent = "جاري الإضافة…";

  try {
    await addDoc(collection(db, "links"), {
      title,
      url,
      icon,
      order:     Date.now(),
      createdAt: serverTimestamp()
    });
    linkTitle.value = "";
    linkUrl.value   = "";
    linkIcon.value  = "";
  } catch (err) {
    linkError.textContent = "خطأ في الإضافة: " + err.message;
  } finally {
    addLinkBtn.disabled    = false;
    addLinkBtn.textContent = "إضافة الرابط";
  }
});

// ══════════════════════════
//  LINKS — Listen (real-time)
// ══════════════════════════
function listenLinks() {
  const q = query(collection(db, "links"), orderBy("order", "asc"));

  onSnapshot(q, (snap) => {
    adminList.innerHTML = "";

    if (snap.empty) {
      adminList.innerHTML = `<li class="empty-state">لا توجد روابط بعد. أضف أول رابط أعلاه.</li>`;
      return;
    }

    snap.forEach((docSnap) => {
      const d  = docSnap.data();
      const id = docSnap.id;
      const li = document.createElement("li");
      li.className = "admin-link-item";
      li.innerHTML = `
        <span class="admin-link-icon">${escapeHtml(d.icon || "🔗")}</span>
        <div class="admin-link-info">
          <div class="admin-link-title">${escapeHtml(d.title)}</div>
          <div class="admin-link-url">${escapeHtml(d.url)}</div>
        </div>
        <div class="admin-link-actions">
          <button class="btn btn-edit"   data-id="${id}">تعديل</button>
          <button class="btn btn-danger" data-id="${id}">حذف</button>
        </div>`;

      li.querySelector(".btn-edit").addEventListener("click",   () => openEdit(id, d));
      li.querySelector(".btn-danger").addEventListener("click", () => deleteLink(id, d.title));
      adminList.appendChild(li);
    });
  });
}

// ══════════════════════════
//  LINKS — Delete
// ══════════════════════════
async function deleteLink(id, title) {
  if (!confirm(`حذف الرابط "${title}"؟`)) return;
  try {
    await deleteDoc(doc(db, "links", id));
  } catch (err) {
    alert("خطأ في الحذف: " + err.message);
  }
}

// ══════════════════════════
//  LINKS — Edit Modal
// ══════════════════════════
function openEdit(id, data) {
  editId.value    = id;
  editTitle.value = data.title || "";
  editUrl.value   = data.url   || "";
  editIcon.value  = data.icon  || "";
  modalOverlay.hidden = false;
}

cancelEditBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
function closeModal() {
  modalOverlay.hidden = true;
}

saveEditBtn.addEventListener("click", async () => {
  const id    = editId.value;
  const title = editTitle.value.trim();
  const url   = editUrl.value.trim();
  const icon  = editIcon.value.trim() || "🔗";

  if (!title || !url) { alert("يرجى ملء العنوان والرابط."); return; }
  if (!isValidUrl(url)) { alert("الرابط غير صحيح."); return; }

  saveEditBtn.disabled    = true;
  saveEditBtn.textContent = "جاري الحفظ…";

  try {
    await updateDoc(doc(db, "links", id), { title, url, icon });
    closeModal();
  } catch (err) {
    alert("خطأ في التعديل: " + err.message);
  } finally {
    saveEditBtn.disabled    = false;
    saveEditBtn.textContent = "حفظ";
  }
});

// ── Helpers ──
function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
