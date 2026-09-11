import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { listRoles, invalidateRole, validPages } from "@/lib/roles";
import { PAGE_KEYS, SYSTEM_ROLE_KEYS } from "@/lib/pages";

const KEY_RE = /^[a-z0-9_-]{1,30}$/;

async function adminUser(req?: NextRequest) {
  const session = await getSession(bearerToken(req as any));
  if (!session) return null;
  const d = await db();
  const u = await d.collection("users").findOne({ _id: new ObjectId(session.id) } as any);
  if (!u || u.role !== "admin") return null;
  return { id: session.id };
}

function pagesErr(pages: unknown) {
  if (!Array.isArray(pages) || pages.length === 0 || pages.some((p) => typeof p !== "string" || !PAGE_KEYS.includes(p)))
    return { error: "اختر صفحة واحدة على الأقل من القائمة" };
  return null;
}

export async function GET(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const roles = await listRoles();
  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const key = typeof b.key === "string" ? b.key.trim() : "";
  if (!name) return NextResponse.json({ error: "اسم الدور مطلوب" }, { status: 400 });
  if (!KEY_RE.test(key))
    return NextResponse.json({ error: "رمز الدور: حروف إنجليزية وأرقام و _ و - فقط (حتى 30)" }, { status: 400 });
  if (SYSTEM_ROLE_KEYS.includes(key))
    return NextResponse.json({ error: "لا يمكن إنشاء دور بنفس رمز دور أساسي" }, { status: 400 });
  const pErr = pagesErr(b.pages);
  if (pErr) return NextResponse.json(pErr, { status: 400 });
  const d = await db();
  if (await d.collection("roles").findOne({ key }))
    return NextResponse.json({ error: "رمز الدور مستخدم بالفعل" }, { status: 409 });
  await d.collection("roles").insertOne({
    key,
    name,
    pages: b.pages.map(String),
    system: false,
    createdAt: new Date(),
  });
  return NextResponse.json({ ok: true, message: "تم إنشاء الدور" }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const d = await db();
  const role = (await d.collection("roles").findOne({ _id: new ObjectId(id) } as any)) as any;
  if (!role) return NextResponse.json({ error: "الدور غير موجود" }, { status: 404 });
  if (role.key === "admin")
    return NextResponse.json({ error: "دور المدير العام أساسي ولا يمكن تعديله" }, { status: 400 });

  const set: any = {};
  if (typeof b.name === "string") {
    if (!b.name.trim()) return NextResponse.json({ error: "اسم الدور مطلوب" }, { status: 400 });
    set.name = b.name.trim();
  }
  if (b.pages !== undefined) {
    const pErr = pagesErr(b.pages);
    if (pErr) return NextResponse.json(pErr, { status: 400 });
    set.pages = validPages(b.pages);
  }
  if (Object.keys(set).length === 0) return NextResponse.json({ error: "لا توجد بيانات للتعديل" }, { status: 400 });
  await d.collection("roles").updateOne({ _id: role._id } as any, { $set: set });
  invalidateRole(role.key);
  return NextResponse.json({ ok: true, message: "تم حفظ الدور" });
}

export async function DELETE(req: NextRequest) {
  const admin = await adminUser(req);
  if (!admin) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const d = await db();
  const role = (await d.collection("roles").findOne({ _id: new ObjectId(id) } as any)) as any;
  if (!role) return NextResponse.json({ error: "الدور غير موجود" }, { status: 404 });
  if (role.system) return NextResponse.json({ error: "لا يمكن حذف دور أساسي" }, { status: 400 });
  const used = await d.collection("users").countDocuments({ role: role.key });
  if (used > 0)
    return NextResponse.json({ error: "الدور مُسند لمستخدمين — غيّر أدوارهم أولاً" }, { status: 400 });
  await d.collection("roles").deleteOne({ _id: role._id } as any);
  invalidateRole(role.key);
  return NextResponse.json({ ok: true, message: "تم حذف الدور" });
}

export const dynamic = "force-dynamic";