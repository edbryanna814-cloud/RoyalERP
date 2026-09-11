import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import {
  createSale, deleteSale, createPurchase, deletePurchase,
  collect, settle, manualMove, updateMove, deleteMove, getCompany, saveCompany,
  partyStatement, dashboard, seedRegions,
} from "@/lib/erp";

const RES_PAGE: Record<string, string> = {
  dashboard: "dashboard",
  items: "inventory",
  customers: "customers",
  suppliers: "suppliers",
  regions: "regions",
  company: "settings",
  sales: "sales",
  purchases: "purchases",
  movements: "treasury",
  payments: "treasury",
};

async function body(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

const asList = (arr: any[]) => arr.map((x) => ({ id: String(x._id), ...x, _id: undefined }));

async function guard(coll: any, query: any) {
  return (await coll.countDocuments(query)) > 0;
}

async function allows(user: any, page: string) {
  return page ? canAccess(user.role || "sales", page) : true;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  const { resource } = await params;
  const d = await db();
  const id = req.nextUrl.searchParams.get("id");
  const kind = req.nextUrl.searchParams.get("kind");
  const page = resource === "statement" ? (kind === "supplier" ? "suppliers" : "customers") : RES_PAGE[resource];
  if (!(await allows(user, page)))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  switch (resource) {
    case "dashboard":
      return NextResponse.json(await dashboard());
    case "items":
      return NextResponse.json(await asList(await d.collection("items").find({}).sort({ name: 1 }).toArray()));
    case "customers":
      return NextResponse.json(await asList(await d.collection("customers").find({}).sort({ name: 1 }).toArray()));
    case "suppliers":
      return NextResponse.json(await asList(await d.collection("suppliers").find({}).sort({ name: 1 }).toArray()));
    case "regions":
      await seedRegions();
      return NextResponse.json(await asList(await d.collection("regions").find({}).sort({ name: 1 }).toArray()));
    case "company":
      return NextResponse.json({ company: await getCompany() });
    case "sales":
      return NextResponse.json(await asList(await d.collection("saleInvoices").find({}).sort({ createdAt: -1 }).toArray()));
    case "purchases":
      return NextResponse.json(await asList(await d.collection("purchaseInvoices").find({}).sort({ createdAt: -1 }).toArray()));
    case "movements":
      return NextResponse.json(await asList(await d.collection("movements").find({}).sort({ createdAt: -1 }).toArray()));
    case "statement":
      if (!id || !["customer", "supplier"].includes(kind || ""))
        return NextResponse.json({ error: "معطيات ناقصة" }, { status: 400 });
      return NextResponse.json(await partyStatement(kind as any, id));
    default:
      return NextResponse.json({ error: "غير معروف" }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  const { resource } = await params;
  const p = await body(req);
  const d = await db();
  if (!(await allows(user, RES_PAGE[resource])))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  try {
    if (resource === "items") {
      if (p.action === "adjust") {
        const item = await d.collection("items").findOne({ _id: new ObjectId(p.id) });
        if (!item) return NextResponse.json({ error: "الصنف غير موجود" }, { status: 404 });
        const delta = parseFloat(p.delta ?? 0);
        const newQty = (item.qty || 0) + delta;
        if (newQty < 0) return NextResponse.json({ error: "الكمية لا يمكن أن تكون سالبة" }, { status: 400 });
        await d.collection("items").updateOne({ _id: item._id }, {
          $set: { qty: newQty },
          $push: { adjustments: { delta, reason: p.reason || "", at: new Date() } },
        } as any);
        return NextResponse.json({ ok: true });
      }
      if (!p.name) return NextResponse.json({ error: "اسم الصنف مطلوب" }, { status: 400 });
      const item = await d.collection("items").insertOne({
        name: p.name.trim(), category: p.category || "أخرى", unit: p.unit || "قطعة",
        qty: parseFloat(p.qty ?? 0), costPrice: parseFloat(p.costPrice ?? 0),
        salePrice: parseFloat(p.salePrice ?? 0), reorderLevel: parseFloat(p.reorderLevel ?? 0),
        createdAt: new Date(),
      });
      return NextResponse.json({ id: String(item.insertedId) }, { status: 201 });
    }
    if (resource === "customers" || resource === "suppliers") {
      if (!p.name) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
      const c = await d.collection(resource).insertOne({
        name: p.name.trim(), phone: p.phone || "", region: p.region || "",
        taxId: p.taxId || "", address: p.address || "", creditBalance: 0, createdAt: new Date(),
      });
      return NextResponse.json({ id: String(c.insertedId) }, { status: 201 });
    }
    if (resource === "regions") {
      if (!p.name) return NextResponse.json({ error: "اسم المنطقة مطلوب" }, { status: 400 });
      const r = await d.collection("regions").insertOne({ name: p.name.trim(), createdAt: new Date() });
      return NextResponse.json({ id: String(r.insertedId) }, { status: 201 });
    }
    if (resource === "company") {
      await saveCompany(p);
      return NextResponse.json({ ok: true });
    }
    if (resource === "sales") {
      return NextResponse.json(await createSale(p));
    }
    if (resource === "purchases") {
      return NextResponse.json(await createPurchase(p));
    }
    if (resource === "payments") {
      if (p.kind === "collect") await collect(p);
      else if (p.kind === "settle") await settle(p);
      else return NextResponse.json({ error: "غير معروف" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    if (resource === "movements") {
      await manualMove(p);
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "خطأ" }, { status: 400 });
  }
  return NextResponse.json({ error: "غير معروف" }, { status: 404 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  const { resource } = await params;
  const p = await body(req);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const d = await db();
  if (!(await allows(user, RES_PAGE[resource])))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  if (resource === "movements") {
    await updateMove(id, p);
    return NextResponse.json({ ok: true });
  }

  const fields = ["items", "customers", "suppliers", "regions"];
  if (!fields.includes(resource)) return NextResponse.json({ error: "غير معروف" }, { status: 404 });

  const allowed = {} as any;
  const doc: any = p;
  for (const k of ["name", "phone", "region", "taxId", "address", "category", "unit", "costPrice", "salePrice", "reorderLevel"]) {
    if (doc[k] !== undefined) allowed[k] = doc[k];
  }
  const res = await d.collection(resource).updateOne({ _id: new ObjectId(id) }, { $set: allowed });
  if (res.matchedCount === 0) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  const { resource } = await params;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرف مفقود" }, { status: 400 });
  const d = await db();
  if (!(await allows(user, RES_PAGE[resource])))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  if (resource === "sales") { await deleteSale(id); return NextResponse.json({ ok: true }); }
  if (resource === "purchases") { await deletePurchase(id); return NextResponse.json({ ok: true }); }
  if (resource === "movements") { await deleteMove(id); return NextResponse.json({ ok: true }); }

  if (resource === "items") {
    const inSale = await d.collection("saleInvoices").findOne({ "rows.itemId": new ObjectId(id) });
    const inBuy = await d.collection("purchaseInvoices").findOne({ "rows.itemId": new ObjectId(id) });
    if (inSale || inBuy) return NextResponse.json({ error: "لا يمكن حذف صنف مرتبط بفواتير سابقة" }, { status: 400 });
  } else if (resource === "customers") {
    if (await guard(d.collection("saleInvoices"), { customerId: new ObjectId(id) }))
      return NextResponse.json({ error: "لا يمكن حذف عميل مرتبط بفواتير بيع" }, { status: 400 });
  } else if (resource === "suppliers") {
    if (await guard(d.collection("purchaseInvoices"), { supplierId: new ObjectId(id) }))
      return NextResponse.json({ error: "لا يمكن حذف مورد مرتبط بفواتير شراء" }, { status: 400 });
  } else if (resource === "regions") {
    const region = await d.collection("regions").findOne({ _id: new ObjectId(id) });
    if (region && await guard(d.collection("customers"), { region: region.name }))
      return NextResponse.json({ error: "لا يمكن حذف منطقة مرتبطة بعملاء" }, { status: 400 });
  } else {
    return NextResponse.json({ error: "غير معروف" }, { status: 404 });
  }

  const res = await d.collection(resource).deleteOne({ _id: new ObjectId(id) });
  if (res.deletedCount === 0) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export const revalidate = 0;
export const dynamic = "force-dynamic";