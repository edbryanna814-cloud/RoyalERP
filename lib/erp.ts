import { ObjectId } from "mongodb";
import { db } from "./mongodb";
import { REGION_DEFAULTS, invoiceTotals } from "./erp-const";

// ponytail: no MongoDB transactions (Atlas M0 usually lacks them). Multi-write ops are
// sequential; crash mid-op could leave an orphan (e.g. stock decremented, ledger missing).
// Upgrade: wrap createSale/createPurchase in a withTransaction once the deployment supports it.
async function c(name: string) {
  const d = await db();
  return d.collection(name);
}

function oid(s: string) {
  return new ObjectId(s);
}

async function nextSeq(type: string) {
  const col = await c("counters");
  const all = await col.find({ type }).toArray();
  const maxSeq = all.reduce((m, d) => Math.max(m, (d as any).seq || 0), 0);
  if (all.length !== 1) {
    await col.deleteMany({ type });
    await col.insertOne({ type, seq: maxSeq });
  }
  const r = await col.findOneAndUpdate(
    { type },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return (r as any).seq as number;
}

export function fmtMoney(n: number) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------- sales ----------

export async function createSale(p: any) {
  const d = await c("customers");
  const customer = await d.findOne({ _id: oid(p.customerId) });
  if (!customer) throw new Error("العميل غير موجود");

  const rows: any[] = [];
  for (const r of p.rows) {
    const item = await (await c("items")).findOne({ _id: oid(r.itemId) });
    if (!item) throw new Error("صنف غير موجود");
    const qty = parseFloat(r.qty ?? 0);
    const price = parseFloat(r.price ?? 0);
    if (!(qty > 0)) throw new Error("الكمية يجب أن تكون أكبر من صفر");
    if (qty > item.qty)
      throw new Error(`الكمية المطلوبة من ${item.name} أكبر من المتاح (المتاح: ${item.qty})`);
    rows.push({ itemId: item._id, name: item.name, unit: item.unit, qty, price });
  }

  const t = invoiceTotals(rows, !!p.vat, parseFloat(p.paid ?? 0));
  const seq = await nextSeq("sale");
  const invoice = {
    number: String(seq).padStart(5, "0"),
    date: p.date || new Date().toISOString().slice(0, 10),
    customerId: oid(p.customerId),
    customerName: customer.name,
    customerRegion: customer.region || "",
    rows,
    ...t,
    vatEnabled: !!p.vat,
    method: p.method || (t.remaining > 0 ? "credit" : "cash"),
    createdAt: new Date(),
  };

  const inv = await (await c("saleInvoices")).insertOne(invoice);
  for (const r of rows)
    await (await c("items")).updateOne({ _id: r.itemId }, { $inc: { qty: -r.qty } });
  if (t.paid > 0)
    await (await c("movements")).insertOne({
      type: "sale", sign: 1, amount: t.paid,
      category: t.remaining > 0 ? "مبيعات - دفعة مقدمة" : "مبيعات - نقدي",
      ref: String(inv.insertedId), date: invoice.date, createdAt: new Date(),
    });
  if (t.remaining > 0)
    await (await c("customers")).updateOne({ _id: customer._id }, { $inc: { creditBalance: t.remaining } });

  return { id: String(inv.insertedId), number: invoice.number, total: t.total, remaining: t.remaining };
}

export async function deleteSale(invoiceId: string) {
  const col = await c("saleInvoices");
  const inv = await col.findOne({ _id: oid(invoiceId) });
  if (!inv) throw new Error("الفاتورة غير موجودة");
  for (const r of inv.rows)
    await (await c("items")).updateOne({ _id: r.itemId }, { $inc: { qty: r.qty } });
  if (inv.remaining > 0)
    await (await c("customers")).updateOne(
      { _id: inv.customerId },
      { $inc: { creditBalance: -inv.remaining } }
    );
  await (await c("movements")).deleteMany({ ref: String(inv._id) });
  await col.deleteOne({ _id: inv._id });
}

// ---------- purchases ----------

export async function createPurchase(p: any) {
  const supplier = await (await c("suppliers")).findOne({ _id: oid(p.supplierId) });
  if (!supplier) throw new Error("المورد غير موجود");

  const rows: any[] = [];
  for (const r of p.rows) {
    const qty = parseFloat(r.qty ?? 0);
    const price = parseFloat(r.price ?? 0);
    if (!(qty > 0)) throw new Error("الكمية يجب أن تكون أكبر من صفر");
    let itemId: ObjectId | null = null;
    if (r.itemId) {
      const item = await (await c("items")).findOne({ _id: oid(r.itemId) });
      if (item) {
        itemId = item._id;
        rows.push({ itemId, name: item.name, unit: item.unit, qty, price });
      } else {
        rows.push({ itemId: null, name: r.name || "صنف محذوف", unit: "", qty, price });
      }
    } else {
      rows.push({ itemId: null, name: r.name || "صنف جديد", unit: "", qty, price });
    }
  }

  const t = invoiceTotals(rows, !!p.vat, parseFloat(p.paid ?? 0));
  const seq = await nextSeq("purchase");
  const invoice = {
    number: String(seq).padStart(5, "0"),
    date: p.date || new Date().toISOString().slice(0, 10),
    supplierId: oid(p.supplierId),
    supplierName: supplier.name,
    rows,
    ...t,
    vatEnabled: !!p.vat,
    method: p.method || (t.remaining > 0 ? "credit" : "cash"),
    createdAt: new Date(),
  };

  const inv = await (await c("purchaseInvoices")).insertOne(invoice);
  for (const r of rows)
    if (r.itemId)
      await (await c("items")).updateOne({ _id: r.itemId }, { $inc: { qty: r.qty } });
  if (t.paid > 0)
    await (await c("movements")).insertOne({
      type: "purchase", sign: -1, amount: t.paid,
      category: t.remaining > 0 ? "مشتريات - دفعة مقدمة" : "مشتريات - نقدي",
      ref: String(inv.insertedId), date: invoice.date, createdAt: new Date(),
    });
  if (t.remaining > 0)
    await (await c("suppliers")).updateOne({ _id: supplier._id }, { $inc: { payableBalance: t.remaining } });

  return { id: String(inv.insertedId), number: invoice.number, total: t.total, remaining: t.remaining };
}

export async function deletePurchase(invoiceId: string) {
  const col = await c("purchaseInvoices");
  const inv = await col.findOne({ _id: oid(invoiceId) });
  if (!inv) throw new Error("الفاتورة غير موجودة");
  for (const r of inv.rows)
    if (r.itemId)
      await (await c("items")).updateOne({ _id: r.itemId }, { $inc: { qty: -r.qty } });
  if (inv.remaining > 0)
    await (await c("suppliers")).updateOne(
      { _id: inv.supplierId },
      { $inc: { payableBalance: -inv.remaining } }
    );
  await (await c("movements")).deleteMany({ ref: String(inv._id) });
  await col.deleteOne({ _id: inv._id });
}

// ---------- payments / treasury ----------

export async function collect(p: any) {
  const amount = parseFloat(p.amount);
  if (!(amount > 0)) throw new Error("أدخل مبلغًا صحيحًا");
  const cust = await (await c("customers")).findOne({ _id: oid(p.partyId) });
  if (!cust) throw new Error("العميل غير موجود");
  await (await c("customers")).updateOne({ _id: cust._id }, { $inc: { creditBalance: -amount } });
  await (await c("movements")).insertOne({
    type: "collect", sign: 1, amount,
    category: `تحصيل من ${cust.name}`,
    partyId: oid(p.partyId), note: p.note || "", date: p.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date(),
  });
}

export async function settle(p: any) {
  const amount = parseFloat(p.amount);
  if (!(amount > 0)) throw new Error("أدخل مبلغًا صحيحًا");
  const sup = await (await c("suppliers")).findOne({ _id: oid(p.partyId) });
  if (!sup) throw new Error("المورد غير موجود");
  await (await c("suppliers")).updateOne({ _id: sup._id }, { $inc: { payableBalance: -amount } });
  await (await c("movements")).insertOne({
    type: "settle", sign: -1, amount,
    category: `سداد إلى ${sup.name}`,
    partyId: oid(p.partyId), note: p.note || "", date: p.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date(),
  });
}

export async function manualMove(p: any) {
  const amount = parseFloat(p.amount);
  const dir = p.dir === "out" ? -1 : 1;
  if (!(amount > 0)) throw new Error("أدخل مبلغًا صحيحًا");
  await (await c("movements")).insertOne({
    type: "manual", sign: dir, amount,
    category: p.category || "مصروفات أخرى",
    note: p.note || "", date: p.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date(),
  });
}

export async function updateMove(id: string, p: any) {
  const col = await c("movements");
  const mv = await col.findOne({ _id: oid(id) });
  if (!mv) throw new Error("الحركة غير موجودة");
  if (mv.type === "sale" || mv.type === "purchase")
    throw new Error("لا يمكن تعديل حركة مرتبطة بفاتورة");
  const amount = parseFloat(p.amount);
  const newAmt = amount > 0 ? amount : mv.amount;
  const sign = mv.type === "collect" || mv.type === "settle" ? mv.sign : p.dir ? (p.dir === "out" ? -1 : 1) : mv.sign;

  if ((mv.type === "collect" || mv.type === "settle") && newAmt !== mv.amount) {
    const delta = newAmt - mv.amount;
    const colName = mv.type === "collect" ? "creditBalance" : "payableBalance";
    const partyCol = await c(mv.type === "collect" ? "customers" : "suppliers");
    const party = await partyCol.findOne({ _id: mv.partyId });
    if (party) await partyCol.updateOne({ _id: party._id }, { $inc: { [colName]: -delta } });
  }

  await col.updateOne({ _id: mv._id }, {
    $set: {
      amount: newAmt, sign,
      category: p.category ?? mv.category,
      note: p.note ?? mv.note,
      date: p.date ?? mv.date,
    },
  });
}

export async function deleteMove(id: string) {
  const col = await c("movements");
  const mv = await col.findOne({ _id: oid(id) });
  if (!mv) throw new Error("الحركة غير موجودة");
  if (mv.type === "sale" || mv.type === "purchase")
    throw new Error("لا يمكن حذف حركة مرتبطة بفاتورة");
  if (mv.type === "collect" || mv.type === "settle") {
    const colName = mv.type === "collect" ? "creditBalance" : "payableBalance";
    const partyCol = await c(mv.type === "collect" ? "customers" : "suppliers");
    const party = await partyCol.findOne({ _id: mv.partyId });
    if (party) await partyCol.updateOne({ _id: party._id }, { $inc: { [colName]: mv.amount } });
  }
  await col.deleteOne({ _id: mv._id });
}

// ---------- company / statement / dashboard ----------

export async function seedRegions() {
  const col = await c("regions");
  if ((await col.countDocuments()) === 0) {
    await col.insertMany(REGION_DEFAULTS.map((name) => ({ name, createdAt: new Date() })));
  }
}

export async function getCompany() {
  return (await (await c("company")).findOne({})) || null;
}

export async function saveCompany(p: any) {
  await (await c("company")).updateOne(
    {},
    { $set: { ...p } },
    { upsert: true }
  );
}

export async function partyStatement(kind: "customer" | "supplier", id: string) {
  const partyId = oid(id);
  const movements = await (await c("movements"))
    .find({ partyId })
    .sort({ date: 1, createdAt: 1 })
    .toArray();
  const rows: any[] = [];

  if (kind === "customer") {
    const sales = await (await c("saleInvoices"))
      .find({ customerId: partyId })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    for (const s of sales) {
      rows.push({ date: s.date, desc: `فاتورة بيع رقم ${s.number}`, debit: s.total, credit: 0 });
      if (s.paid > 0)
        rows.push({ date: s.date, desc: `المدفوع عند فاتورة ${s.number}`, debit: 0, credit: s.paid });
    }
  } else {
    const buys = await (await c("purchaseInvoices"))
      .find({ supplierId: partyId })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    for (const b of buys) {
      rows.push({ date: b.date, desc: `فاتورة شراء رقم ${b.number}`, debit: b.paid, credit: b.total });
    }
  }
  for (const m of movements) {
    rows.push({
      date: m.date,
      desc: m.type === "collect" ? "تحصيل من العميل" : "سداد للمورد",
      debit: m.type === "settle" ? m.amount : 0,
      credit: m.type === "collect" ? m.amount : 0,
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let balance = 0;
  for (const r of rows) {
    if (kind === "customer") balance += r.debit - r.credit;
    else balance -= r.debit - r.credit;
    r.balance = Math.round(balance * 100) / 100;
  }
  return { kind, rows, balance: Math.round(balance * 100) / 100, partyId: id };
}

export async function dashboard() {
  const d = await db();
  const [sales, purchases, moves, items, customers, suppliers] = [
    await d.collection("saleInvoices").find({}).toArray(),
    await d.collection("purchaseInvoices").find({}).toArray(),
    await d.collection("movements").find({}).toArray(),
    await d.collection("items").find({}).toArray(),
    await d.collection("customers").find({}).toArray(),
    await d.collection("suppliers").find({}).toArray(),
  ];
  const sum = (arr: any[], k: string) => Math.round(arr.reduce((s, x) => s + (x[k] || 0), 0) * 100) / 100;
  const treasury = Math.round(moves.reduce((s, m) => s + (m.sign || 1) * m.amount, 0) * 100) / 100;

  const byRegion: Record<string, number> = {};
  for (const s of sales) {
    const region = s.customerRegion || "غير محدد";
    byRegion[region] = (byRegion[region] || 0) + s.total;
  }

  return {
    totalSales: sum(sales, "total"),
    totalPurchases: sum(purchases, "total"),
    treasury,
    creditDue: sum(customers, "creditBalance"),
    payableDue: sum(suppliers, "payableBalance"),
    lowStock: items.filter((i) => i.qty <= (i.reorderLevel ?? 0)),
    byRegion,
    recentSales: sales.slice(-6).reverse().map((s) => ({
      id: String(s._id), number: s.number, date: s.date, customerName: s.customerName, total: s.total,
    })),
  };
}