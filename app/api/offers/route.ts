import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { canAccess } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  if (!(await canAccess(user.role || "sales", "savedOffers")))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });
  const d = await db();
  const items = await d
    .collection("offers")
    .find({ userId: user.id })
    .sort({ savedAt: -1 })
    .toArray();
  const offers = items.map((o) => ({ id: String(o._id), ...o, _id: undefined }));
  return NextResponse.json({ offers });
}

export async function POST(req: NextRequest) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  if (!(await canAccess(user.role || "sales", "quotes")))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });
  const data = await req.json();
  const d = await db();
  const res = await d.collection("offers").insertOne({
    userId: user.id,
    meta: data.meta || {},
    customer: data.customer || {},
    rows: data.rows || [],
    grandTotal: data.grandTotal || 0,
    savedAt: new Date(),
  });
  return NextResponse.json({ id: String(res.insertedId) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  if (!(await canAccess(user.role || "sales", "savedOffers")))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const d = await db();
  await d
    .collection("offers")
    .deleteOne({ _id: new ObjectId(id), userId: user.id });
  return NextResponse.json({ ok: true });
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
