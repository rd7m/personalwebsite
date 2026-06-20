# 🔗 Remlex — Link in Bio

مشروع "Link in Bio" ديناميكي يعمل على **GitHub Pages** مع **Firebase** (Firestore + Auth) كـ Backend.

---

## 📁 هيكل الملفات

```
/
├── index.html          ← واجهة العرض العامة
├── admin.html          ← لوحة التحكم (محمية بتسجيل الدخول)
├── style.css           ← التصميم المشترك
├── app.js              ← JavaScript للعرض
├── admin.js            ← JavaScript للوحة التحكم
├── firebase-config.js  ← 🔑 بيانات Firebase (عدّلها أولاً)
└── README.md
```

---

## 🚀 خطوات الإعداد

### 1. إنشاء مشروع Firebase

1. اذهب إلى [console.firebase.google.com](https://console.firebase.google.com)
2. اضغط **"Add project"** → أدخل اسم المشروع → أنشئه
3. من الصفحة الرئيسية اضغط أيقونة **`</>`** (Web) لإضافة تطبيق ويب
4. أدخل اسم التطبيق واضغط **Register app**
5. **انسخ** كائن `firebaseConfig` الظاهر

### 2. ضع البيانات في `firebase-config.js`

افتح الملف `firebase-config.js` والصق بياناتك:

```js
export const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "my-project.firebaseapp.com",
  projectId:         "my-project",
  storageBucket:     "my-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123...:web:abc..."
};
```

### 3. إعداد Firestore

1. في Firebase Console → **Firestore Database** → **Create database**
2. اختر **"Start in production mode"** → اختر المنطقة → **Enable**
3. اذهب إلى **Rules** والصق هذه القواعد:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // الروابط والملف الشخصي: قراءة عامة، كتابة للمستخدمين المسجلين فقط
    match /links/{linkId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /settings/profile {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. اضغط **Publish**

### 4. إعداد Authentication

1. في Firebase Console → **Authentication** → **Get started**
2. اذهب إلى تبويب **Sign-in method**
3. فعّل **Email/Password**
4. اذهب إلى تبويب **Users** → **Add user**
5. أدخل بريدك وكلمة مرور قوية → **Add user**

### 5. رفع المشروع على GitHub Pages

```bash
# 1. أنشئ مستودعاً جديداً على GitHub (Public)
# 2. ارفع جميع الملفات

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# 3. في إعدادات المستودع → Pages → Source: main / root
# الموقع سيكون متاحاً على:
# https://USERNAME.github.io/REPO/
```

---

## 🗂 هيكل Firestore

### مجموعة `links` (كل وثيقة = رابط)

| الحقل       | النوع     | الوصف                         |
|-------------|-----------|-------------------------------|
| `title`     | string    | عنوان الرابط                  |
| `url`       | string    | الرابط الكامل                 |
| `icon`      | string    | emoji أو نص قصير             |
| `order`     | number    | لترتيب الروابط (timestamp)    |
| `createdAt` | timestamp | وقت الإنشاء                   |

### وثيقة `settings/profile`

| الحقل       | النوع     | الوصف                         |
|-------------|-----------|-------------------------------|
| `name`      | string    | الاسم المعروض                 |
| `bio`       | string    | النبذة التعريفية              |
| `avatarUrl` | string    | رابط الصورة الشخصية (اختياري) |
| `updatedAt` | timestamp | آخر تحديث                     |

---

## 🔗 الروابط المهمة

- **الصفحة العامة:** `https://USERNAME.github.io/REPO/`
- **لوحة التحكم:** `https://USERNAME.github.io/REPO/admin.html`

---

## ✅ ملاحظات

- الأكواد مكتوبة بـ **Vanilla JS** بدون أي framework
- تستخدم Firebase SDK نسخة **10.12.2** عبر CDN (متوافق مع GitHub Pages)
- التحديثات تظهر **فورياً** على الصفحة العامة بدون إعادة تحميل (onSnapshot)
- التصميم يدعم **الهاتف والكمبيوتر** (Responsive)
