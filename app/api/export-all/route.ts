import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { canAccess } from "@/lib/roles";

const dt = (d: Date | string) => (d ? new Date(d).toLocaleString("ar-EG") : "");

export async function GET(req: NextRequest) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  if (!(await canAccess(user.role || "sales", "savedOffers")))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  const d = await db();
  const scoop = async (coll: string) =>
    d.collection(coll).find({}).sort({ createdAt: 1 }).toArray();

  const [customers, suppliers, items, regions, offers, sales, purchases, movements, company] = await Promise.all([
    scoop("customers"),
    scoop("suppliers"),
    scoop("items"),
    scoop("regions"),
    d.collection("offers").find({}).sort({ savedAt: 1 }).toArray(),
    d.collection("saleInvoices").find({}).sort({ createdAt: 1 }).toArray(),
    d.collection("purchaseInvoices").find({}).sort({ createdAt: 1 }).toArray(),
    d.collection("movements").find({}).sort({ createdAt: 1 }).toArray(),
    (await d.collection("company").findOne({})) || {},
  ]) as any[];

  const companyRows = [{
    "company Name": company.companyName || "",
    "tax Id": company.taxId || "",
    "commercial Reg": company.commercialReg || "",
    "address": company.address || "",
    "phone": company.phone || "",
  }];

  const customerRows = customers.map((c: any) => ({
    "customer Name": c.name, "customer Phone": c.phone || "", "customer Region": c.region || "",
    "tax Id": c.taxId || "", "address": c.address || "", "credit Balance": c.creditBalance || 0,
  }));
  const supplierRows = suppliers.map((s: any) => ({
    "supplier Name": s.name, "supplier Phone": s.phone || "", "supplier Region": s.region || "",
    "tax Id": s.taxId || "", "address": s.address || "", "credit Balance": s.creditBalance || 0,
  }));
  const itemRows = items.map((i: any) => ({
    "item Name": i.name, "item Category": i.category || "", "item Unit": i.unit || "",
    "item Quantity": i.qty || 0, "item Cost Price": i.costPrice || 0, "item Sale Price": i.salePrice || 0,
    "item Reorder Level": i.reorderLevel || 0,
  }));
  const regionRows = regions.map((r: any) => ({ "region Name": r.name }));

  const offerSummary = offers.map((q: any) => ({
    "offer Number": q.meta.offerNumber || "", "offer Date": q.meta.date || "", "offer Valid Until": q.meta.validUntil || "",
    "customer Name": q.customer.name || "", "customer Phone": q.customer.phone || "", "customer Region": q.customer.region || "",
    "offer Items": q.rows.length, "offer Total (EGP)": q.grandTotal, "offer Created At": dt(q.savedAt),
  }));
  const offerItems: any[] = [];
  for (const q of offers) {
    for (const r of q.rows) {
      offerItems.push({
        "offer Number": q.meta.offerNumber || "", "customer Name": q.customer.name || "",
        "item Name": r.item || "", "item Quantity": r.qty || "", "item Price": r.price || "",
        "item Carton": r.carton || "", "item Notes": r.notes || "",
        "item Total": (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0),
      });
    }
  }

  const salesRows = sales.map((s: any) => ({
    "invoice Number": "INV-" + s.number, "invoice Date": dt(s.date || s.createdAt),
    "customer Name": s.customerName || "", "customer Region": s.customerRegion || "",
    "payment Method": (s.method === "cash" ? "Cash" : "Credit"),
    "invoice Total": s.total || 0, "vat": s.vat || 0, "amount Paid": s.paid || 0,
    "balance": Math.max(0, (s.total || 0) - (s.paid || 0)),
  }));
  const purchaseRows = purchases.map((p: any) => ({
    "purchase Invoice Number": "PUR-" + p.number, "purchase Date": dt(p.date || p.createdAt),
    "supplier Name": p.supplierName || "", "payment Method": (p.method === "cash" ? "Cash" : "Credit"),
    "total": p.total || 0, "vat": p.vat || 0, "amount Paid": p.paid || 0,
    "balance": Math.max(0, (p.total || 0) - (p.paid || 0)),
  }));
  const movementRows = movements.map((m: any) => ({
    "date": dt(m.date || m.createdAt),
    "type": m.type === "in" || m.sign >= 0 ? "in" : "out",
    "amount": (m.sign < 0 ? -1 : 1) * (Number(m.amount) || 0),
    "category": m.category || "", "note": m.note || "",
  }));

  const wb = XLSX.utils.book_new();
  const put = (name: string, rows: any[]) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  put("companyRows", companyRows);
  put("customerRows", customerRows);
  put("supplierRows", supplierRows);
  put("itemRows", itemRows);
  put("regionRows", regionRows);
  put("offerSummary", offerSummary);
  put("offerItems", offerItems);
  put("salesRows", salesRows);
  put("purchaseRows", purchaseRows);
  put("movementRows", movementRows);

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fileName = `royal-erp-full-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export const dynamic = "force-dynamic";
