# Royal Price Offers (رويال للتوريدات العمومية)

Next.js 16 + MongoDB app لإدارة عروض الأسعار: إنشاء عرض، حفظه، وتصديره إلى Excel.

## التشغيل

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم
npm run dev                  # http://localhost:3000
```

`.env.local` مطلوب فيه:
- `MONGODB_URI` — رابط MongoDB Atlas (cluster + user/password)
- `JWT_SECRET` — سرّ طويل عشوائي
- `APP_URL` — يظهر في رابط إعادة تعيين كلمة المرور المطبوع في السجل
- `MONGODB_DB` (اختياري) — اسم قاعدة البيانات، الافتراضي `royal_quotes`

## الاستعادة / نسيت كلمة المرور

المشروع بيطبع رابط إعادة التعيين في **سجل الخادم** (console) لأن مفيش خدمة إيميل.
الـ App ينشئ تلقائياً مستخدمين، الـ collections (`users`, `sessions`, `offers`) بتتعمل أول ما يستخدمها.

## المسارات

- `/login` `/register` `/forgot` `/reset/[token]` — المصادقة
- `/` — إنشاء عرض سعر (يحميها تسجيل الدخول)
- `/offers` — العروض المحفوظة + تصدير Excel
- `/api/export` — تنزيل كل البيانات كملف Excel (عرض واحد: `?id=`)

## فحص سريع

```bash
npm run build
node scripts/check.mjs
```
