import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ObjectId } from "mongodb";
import { db } from "@/lib/mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { canAccess } from "@/lib/roles";

const dt = (d: Date) =>
  new Date(d).toLocaleString("ar-EG");

export async function GET(req: NextRequest) {
  const user = await getSession(bearerToken(req));
  if (!user) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  if (!(await canAccess(user.role || "sales", "savedOffers")))
    return NextResponse.json({ error: "غير مخوّل لهذه الصفحة" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  const d = await db();
  const query: any = {};
  if (id) query._id = new ObjectId(id);

  const offers = await d
    .collection("offers")
    .find(query)
    .sort({ savedAt: -1 })
    .toArray();
  if (id && offers.length === 0) {
    return NextResponse.json({ error: "العرض غير موجود" }, { status: 404 });
  }

  const summaryRows = offers.map((q) => ({
    "رقم العرض": q.meta.offerNumber || "",
    "التاريخ": q.meta.date || "",
    "صالح حتى": q.meta.validUntil || "",
    "اسم العميل": q.customer.name || "",
    "رقم الهاتف": q.customer.phone || "",
    "العنوان": q.customer.address || "",
    "عدد البنود": q.rows.length,
    "الإجمالي (ج.م)": q.grandTotal,
    "تاريخ الحفظ": dt(q.savedAt),
  }));

  const itemRows: any[] = [];
  for (const q of offers) {
    for (const r of q.rows) {
      itemRows.push({
        "رقم العرض": q.meta.offerNumber || "",
        "اسم العميل": q.customer.name || "",
        "الصنف": r.item || "",
        "الكمية": r.qty || "",
        "سعر الوحدة": r.price || "",
        "عدد الوحدة (الكرتونة)": r.carton || "",
        "ملاحظات": r.notes || "",
        "الإجمالي": (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0),
      });
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "ملخص العروض");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(itemRows), "بنود العروض");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const base = id ? (offers[0].meta.offerNumber || "offer") : `royal-offers-export-${new Date().toISOString().slice(0, 10)}`;
  const fileName = `${base}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

export const dynamic = "force-dynamic";
