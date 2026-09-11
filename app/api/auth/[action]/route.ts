import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/mongodb";
import {
  signAccess,
  newRefreshToken,
  hash,
  saveRefreshToken,
  isValidRefreshToken,
  deleteSession,
  setSessionCookies,
  clearSessionCookies,
  getRefreshToken,
  getSession,
  bearerToken,
} from "@/lib/auth";
import { sendPasswordResetEmail, mailConfigured } from "@/lib/mail";

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function publicUser(u: any) {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role || "sales" };
}

async function issueSession(userId: string) {
  const d = await db();
  const user = await d.collection("users").findOne({ _id: userId } as any);
  if (!user) throw new Error("المستخدم غير موجود");
  const sessionUser = publicUser(user);
  const access = signAccess(sessionUser);
  const refresh = newRefreshToken();
  await saveRefreshToken(refresh, String(user._id));
  await setSessionCookies(access, refresh);
  return { user: sessionUser, access, refresh };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const data = await body(req);
  const d = await db();
  const users = d.collection("users");

  if (action === "register") {
    const total = await users.countDocuments();
    if (total > 0) {
      return NextResponse.json({ error: "التسجيل مغلق — حسابك ينشئه مدير النظام" }, { status: 403 });
    }
    const { name, email, password } = data;
    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json({ error: "الاسم والبريد وكلمة مرور (6 أحرف على الأقل) مطلوبة" }, { status: 400 });
    }
    // ponytail: first-ever account becomes the owner/admin; all later users are added by admin
    const u = await users.insertOne({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
      createdAt: new Date(),
    });
    const sessionUser = await issueSession(u.insertedId as any);
    return NextResponse.json(sessionUser);
  }

  if (action === "login") {
    const { email, password } = data;
    const user = await users.findOne({ email: String(email || "").toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const sessionUser = await issueSession(user._id as any);
    return NextResponse.json(sessionUser);
  }

  if (action === "refresh") {
    const fromBody = data?.token;
    const token = fromBody || await getRefreshToken();
    if (!token || !(await isValidRefreshToken(token))) {
      return NextResponse.json({ error: "الجلسة منتهية" }, { status: 401 });
    }
    const d2 = await db();
    const sess = (await d2.collection("sessions").findOne({ token: hash(token) }))!;
    const user = await users.findOne({ _id: sess.userId } as any);
    if (!user) return NextResponse.json({ error: "الجلسة منتهية" }, { status: 401 });
    await deleteSession(token);
    const sessionUser = await issueSession(user._id as any);
    return NextResponse.json(sessionUser);
  }

  if (action === "logout") {
    const token = data?.token || await getRefreshToken();
    if (token) await deleteSession(token);
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  }

  if (action === "change-password") {
    const user = await getSession(bearerToken(req));
    if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
    const { old, new: pw } = data;
    if (!pw || String(pw).length < 6) {
      return NextResponse.json({ error: "كلمة المرور الجديدة (6 أحرف على الأقل) مطلوبة" }, { status: 400 });
    }
    const doc = await users.findOne({ _id: user.id } as any);
    if (!doc || !(await bcrypt.compare(String(old || ""), doc.passwordHash))) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }
    await users.updateOne({ _id: doc._id }, { $set: { passwordHash: await bcrypt.hash(String(pw), 10) } });
    return NextResponse.json({ ok: true });
  }

  if (action === "forgot") {
    // Always return a success message regardless of whether the email exists.
    const { email } = data;
    const user = await users.findOne({ email: String(email || "").toLowerCase().trim() });
    let link = "";
    if (user) {
      const token = randomBytes(32).toString("hex");
      await db().then((d2) =>
        d2.collection("users").updateOne(
          { _id: user._id } as any,
          { $set: { resetToken: hash(token), resetExpires: new Date(Date.now() + 30 * 60 * 1000) } }
        )
      );
      const base = process.env.APP_URL || "http://localhost:3000";
      link = `${base}/reset/${token}`;
      console.log(`[royal] password reset link for ${user.email}: ${link}`);
      if (mailConfigured) {
        try {
          await sendPasswordResetEmail(user.email as string, link);
          return NextResponse.json({
            message: `لو البريد ده مسجل، بعتنالك إيميل استعادة الباسورد على ${user.email}.`,
          });
        } catch (e) {
          console.error("[royal] failed to send password reset email:", e);
          return NextResponse.json({
            message: `تعذر إرسال الإيميل، بس فتحنا رابط الاستعادة ليك مباشرة: ${link}`,
          });
        }
      }
    }
    return NextResponse.json({
      message: link
        ? `تم إرسال رابط الاستعادة. (رابط مطبوع في سجل الخادم: ${link})`
        : "لو البريد ده مسجل هتوصلهم رسالة الاستعادة.",
    });
  }

  if (action === "reset") {
    const { token, password } = data;
    const user = await users.findOne({ resetToken: hash(token || ""), resetExpires: { $gt: new Date() } });
    if (!user) return NextResponse.json({ error: "الرابط غير صالح أو منتهي" }, { status: 400 });
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
    }
    await users.updateOne(
      { _id: user._id } as any,
      { $set: { passwordHash: await bcrypt.hash(password, 10) }, $unset: { resetToken: "", resetExpires: "" } }
    );
    await d.collection("sessions").deleteMany({ userId: String(user._id) });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 404 });
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
