import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";

const ROLES = ["admin", "sales", "purchase"];

async function adminUser(req?: NextRequest): Promise<{ id: string } | null> {
  const session = await getSession(bearerToken(req as any));
  if (!session) return null;
  const d = await db();
  const u = await d.collection("users").findOne({ _id: new ObjectId(session.id) } as any);
  if (!u || u.role !== "admin") return null;
  return { id: session.id };
}

export async function GET(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const d = await db();
  const users = await d.collection("users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: 1 }).toArray();
  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id), name: u.name, email: u.email, role: u.role || "sales", createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { name, email, password, role } = body;
  if (!name || !email || !password || password.length < 6)
    return NextResponse.json({ error: "الاسم والبريد وكلمة مرور (6 أحرف على الأقل) مطلوبة" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: "دور غير معروف" }, { status: 400 });
  const d = await db();
  const users = d.collection("users");
  const emailLower = String(email).toLowerCase().trim();
  if (await users.findOne({ email: emailLower }))
    return NextResponse.json({ error: "هذا البريد مسجل بالفعل" }, { status: 409 });
  const res = await users.insertOne({
    name: String(name).trim(), email: emailLower,
    passwordHash: await bcrypt.hash(String(password), 10), role, createdAt: new Date(),
  });
  return NextResponse.json({ id: String(res.insertedId) }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const d = await db();
  if (body.password) {
    if (String(body.password).length < 6)
      return NextResponse.json({ error: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
    await d.collection("users").updateOne({ _id: new ObjectId(id) } as any, {
      $set: { passwordHash: await bcrypt.hash(String(body.password), 10) },
    });
    return NextResponse.json({ ok: true });
  }
  const role = body.role;
  if (!ROLES.includes(role)) return NextResponse.json({ error: "دور غير معروف" }, { status: 400 });
  if (String(id) === admin.id && role !== "admin")
    return NextResponse.json({ error: "لا يمكنك تغيير دور المدير الأساسي لنفسك" }, { status: 400 });
  const res = await d.collection("users").updateOne({ _id: new ObjectId(id) } as any, { $set: { role } });
  if (res.matchedCount === 0) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  if (String(id) === admin.id) return NextResponse.json({ error: "لا يمكنك حذف نفسك" }, { status: 400 });
  const d = await db();
  const target = await d.collection("users").findOne({ _id: new ObjectId(id) } as any);
  if (!target) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (target.role === "admin") {
    const adminCount = await d.collection("users").countDocuments({ role: "admin" });
    if (adminCount <= 1) return NextResponse.json({ error: "لا يمكن حذف آخر مدير" }, { status: 400 });
  }
  await d.collection("users").deleteOne({ _id: new ObjectId(id) } as any);
  await d.collection("sessions").deleteMany({ userId: String(id) });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";