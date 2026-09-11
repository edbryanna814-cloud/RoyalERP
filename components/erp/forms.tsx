"use client";

// All ERP dialogs ported from the original app, wired to the Mongo backend payloads.

import { useState } from "react";
import { Icon, Modal, tt, an, ii, ui, LE, fmt, fmtDate, today, labelCls, inputCls, numClean, DropSelect } from "./ui";

function Num({
  onChange,
  ...rest
}: {
  className?: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      dir="ltr"
      onChange={(e) => onChange(numClean(e.target.value))}
    />
  );
}

export type FormItem = {
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
};

export type InvoiceDraft = {
  kind: "sale" | "purchase";
  partyId: string;
  date: string;
  region: string;
  vat: boolean;
  paymentType: "cash" | "credit";
  paidNow: number;
  rows: FormItem[];
};

const units = ["قطعة", "كرتونة", "كيلوجرام", "لفة", "طن", "متر", "درزينة"];
const categories = ["كرتون", "بلاستيك", "ورق طباعة", "ملصقات وإتيكيت", "مستلزمات طباعة", "أخرى"];
const treasuryCats = [
  "إيجار",
  "رواتب",
  "تسويق",
  "مرافق وفواتير",
  "صيانة",
  "مصروفات أخرى",
  "إيراد آخر",
  "استرداد",
];

type Party = { id: string; name: string; phone?: string; region?: string; taxId?: string; address?: string };
type Item = {
  id: string;
  name: string;
  unit?: string;
  qty?: number;
  salePrice?: number;
  costPrice?: number;
  reorderLevel?: number;
  category?: string;
};
type Company = { companyName?: string; taxId?: string; commercialReg?: string; address?: string; phone?: string };

const V = 0.14;

export function CustomerForm({
  initial,
  regions,
  onSave,
  onClose,
}: {
  initial?: Party | null;
  regions: { id: string; name: string }[];
  onSave: (m: { data: Partial<Party> }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    region: initial?.region || "",
    taxId: initial?.taxId || "",
    address: initial?.address || "",
  });
  const save = () => {
    if (!f.name.trim() || !f.phone.trim()) return;
    onSave({ data: { name: f.name.trim(), phone: f.phone.trim(), region: f.region, taxId: f.taxId, address: f.address } });
  };
  return (
    <Modal title={initial ? "تعديل بيانات العميل" : "إضافة عميل جديد"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>اسم العميل *</label>
          <input className={inputCls} placeholder="اسم الشركة أو العميل" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>رقم الهاتف</label>
          <input className={inputCls} dir="ltr" placeholder="01xxxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>المنطقة</label>
          <DropSelect
            value={f.region}
            onChange={(v) => setF({ ...f, region: v })}
            options={[{ value: "", label: "غير محدد" }, ...(regions || []).map((r) => ({ value: r.name, label: r.name }))]}
          />
        </div>
        <div>
          <label className={labelCls}>الرقم الضريبي (اختياري)</label>
          <input className={inputCls} dir="ltr" placeholder="للعملاء المسجلين بضريبة القيمة المضافة" value={f.taxId} onChange={(e) => setF({ ...f, taxId: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>العنوان</label>
          <input className={inputCls} placeholder="العنوان بالتفصيل" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded text-sm font-bold text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: an }}
            disabled={!f.name.trim() || !f.phone.trim()}
          >
            <Icon name="check-circle2" size={16} /> حفظ
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function SupplierForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Party | null;
  onSave: (m: { data: Partial<Party> }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    taxId: initial?.taxId || "",
    address: initial?.address || "",
  });
  const save = () => {
    if (!f.name.trim() || !f.phone.trim()) return;
    onSave({ data: { name: f.name.trim(), phone: f.phone.trim(), taxId: f.taxId, address: f.address } });
  };
  return (
    <Modal title={initial ? "تعديل بيانات المورد" : "إضافة مورد جديد"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>اسم المورد *</label>
          <input className={inputCls} placeholder="اسم الشركة أو المورد" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>رقم الهاتف</label>
          <input className={inputCls} dir="ltr" placeholder="01xxxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>الرقم الضريبي للمورد</label>
          <input className={inputCls} dir="ltr" placeholder="للعملاء المسجلين بضريبة القيمة المضافة" value={f.taxId} onChange={(e) => setF({ ...f, taxId: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>العنوان</label>
          <input className={inputCls} placeholder="العنوان بالتفصيل" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: an }}
            disabled={!f.name.trim() || !f.phone.trim()}
          >
            <Icon name="check-circle2" size={16} /> حفظ
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ProductForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Item | null;
  onSave: (m: { data: { name: string; category: string; unit: string; qty: number; costPrice: number; salePrice: number; reorderLevel: number } }) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    name: initial?.name || "",
    category: initial?.category || "",
    unit: initial?.unit || "قطعة",
    qty: String(initial?.qty ?? 0),
    costPrice: String(initial?.costPrice ?? ""),
    salePrice: String(initial?.salePrice ?? ""),
    reorderLevel: String(initial?.reorderLevel ?? ""),
  });
  const save = () => {
    if (!f.name.trim()) return;
    onSave({
      data: {
        name: f.name.trim(),
        category: f.category,
        unit: f.unit,
        qty: Number(f.qty) || 0,
        costPrice: Number(f.costPrice) || 0,
        salePrice: Number(f.salePrice) || 0,
        reorderLevel: Number(f.reorderLevel) || 0,
      },
    });
  };
  return (
    <Modal title={initial ? "تعديل صنف" : "إضافة صنف جديد"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>اسم الصنف *</label>
          <input className={inputCls} placeholder="مثال: كرتون مضلع مقاس 30×20" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>التصنيف</label>
            <DropSelect
              value={f.category}
              onChange={(v) => setF({ ...f, category: v })}
              options={[{ value: "", label: "كرتون، بلاستيك..." }, ...categories.map((c) => ({ value: c, label: c }))]}
            />
          </div>
          <div>
            <label className={labelCls}>الوحدة</label>
            <DropSelect
              value={f.unit}
              onChange={(v) => setF({ ...f, unit: v })}
              options={units.map((u) => ({ value: u, label: u }))}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>الكمية الحالية</label>
          <Num className={inputCls} value={f.qty} disabled={!!initial} onChange={(v) => setF({ ...f, qty: v })} />
          {initial && <p className="text-[11px] text-amber-700 mt-1.5">لتعديل الكمية استخدم زر «تسوية المخزون» بدلاً من التعديل المباشر لضمان دقة السجلات.</p>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>سعر التكلفة</label>
            <Num className={inputCls} value={f.costPrice} onChange={(v) => setF({ ...f, costPrice: v })} />
          </div>
          <div>
            <label className={labelCls}>سعر البيع</label>
            <Num className={inputCls} value={f.salePrice} onChange={(v) => setF({ ...f, salePrice: v })} />
          </div>
          <div>
            <label className={labelCls}>حد إعادة الطلب (تنبيه نقص المخزون)</label>
            <Num className={inputCls} value={f.reorderLevel} onChange={(v) => setF({ ...f, reorderLevel: v })} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={save}
            className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: an }}
            disabled={!f.name.trim()}
          >
            <Icon name="check-circle2" size={16} /> حفظ
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function StockAdjustForm({
  item,
  onSave,
  onClose,
}: {
  item: Item;
  onSave: (m: { delta: number; reason: string }) => void;
  onClose: () => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const d = Number(delta);
  const next = (Number(item.qty) || 0) + (isNaN(d) ? 0 : d);
  const ok = !isNaN(d) && d !== 0;
  return (
    <Modal title={`تسوية مخزون: ${item.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">الكمية الحالية:</span>
          <span className="text-lg font-bold" style={{ color: tt }}>
            {item.qty ?? 0} {item.unit || ""}
          </span>
        </div>
        <div>
          <label className={labelCls}>التعديل (+ إضافة / - خصم)</label>
          <Num className={inputCls} placeholder="مثال: -3 أو 10" value={delta} onChange={setDelta} />
        </div>
        <div>
          <label className={labelCls}>السبب</label>
          <input className={inputCls} placeholder="جرد، تالف، ..." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3">
          <span className="text-sm text-amber-900">الكمية بعد التعديل:</span>
          <span className="text-lg font-bold text-amber-900">
            {next} {item.unit || ""}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => ok && onSave({ delta: d, reason })} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: an }} disabled={!ok}>
            تأكيد التسوية
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function InvoiceForm({
  mode,
  parties,
  items,
  regions,
  initialPartyId,
  onSave,
  onClose,
}: {
  mode: "sale" | "purchase";
  parties: Party[];
  items: Item[];
  regions: { id: string; name: string }[];
  initialPartyId?: string;
  onSave: (draft: InvoiceDraft) => void;
  onClose: () => void;
}) {
  const [partyId, setPartyId] = useState(initialPartyId || "");
  const [date, setDate] = useState(today());
  const [region, setRegion] = useState("");
  const [vat, setVat] = useState(true);
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [paidNow, setPaidNow] = useState("");
  const [rows, setRows] = useState<{ itemId: string; qty: string; price: string }[]>([{ itemId: "", qty: "1", price: "" }]);

  const addRow = () => setRows([...rows, { itemId: "", qty: "1", price: "" }]);
  const setRow = (i: number, p: Partial<{ itemId: string; qty: string; price: string }>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const delRow = (i: number) => setRows(rows.filter((_, j) => j !== i));

  const valRows = rows.map((r) => {
    const it = items.find((x) => x.id === r.itemId);
    const price = Number(r.price) || 0;
    const qty = Math.max(0, Number(r.qty) || 0);
    return { r, it, price, qty, total: qty * price };
  });
  const subtotal = valRows.reduce((s, x) => s + x.total, 0);
  const vatAmt = vat ? subtotal * V : 0;
  const total = subtotal + vatAmt;
  const paid = paymentType === "cash" ? total : Math.min(Number(paidNow) || 0, total);
  const rem = Math.max(0, total - paid);
  const ready = !!(partyId && date && rows.some((r) => r.itemId && Number(r.qty) > 0 && Number(r.price) > 0));

  const pickParty = (id: string) => {
    setPartyId(id);
    const p = parties.find((x) => x.id === id);
    if (mode === "sale" && p?.region) setRegion(p.region);
  };

  const save = () => {
    if (!ready) return;
    onSave({
      kind: mode,
      partyId,
      date,
      region,
      vat,
      paymentType,
      paidNow: paymentType === "cash" ? total : Number(paidNow) || 0,
      rows: valRows
        .filter((x) => x.r.itemId && x.qty > 0 && x.price > 0)
        .map((x) => ({ itemId: x.r.itemId, name: x.it?.name || "", unit: x.it?.unit || "قطعة", qty: x.qty, price: x.price })),
    });
  };

  return (
    <Modal
      title={mode === "sale" ? "فاتورة بيع جديدة" : "فاتورة شراء جديدة"}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 flex items-center gap-2">
            <Icon name="alert-triangle" size={15} className="shrink-0" />
            <span>أضف صنفًا واحدًا على الأقل بالمخزون قبل إنشاء الفاتورة.</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{mode === "sale" ? "العميل" : "المورد"}</label>
            <select className={inputCls} value={partyId} onChange={(e) => pickParty(e.target.value)}>
              <option value="">اختر...</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>التاريخ</label>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {mode === "sale" && (
            <div>
              <label className={labelCls}>المنطقة</label>
              <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">غير محدد</option>
                {(regions || []).map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => {
            const x = valRows[i];
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <select
                    className={inputCls}
                    value={r.itemId}
                    onChange={(e) => {
                      const it = items.find((z) => z.id === e.target.value);
                      setRow(i, { itemId: e.target.value, price: it ? String(mode === "sale" ? it.salePrice ?? "" : it.costPrice ?? "") : "" });
                    }}
                  >
                    <option value="">الصنف</option>
                    {items.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({mode === "sale" ? `متاح: ${z.qty ?? 0}` : `الحالي: ${z.qty ?? 0}`})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <Num className={inputCls} placeholder="الكمية" value={r.qty} onChange={(v) => setRow(i, { qty: v })} />
                </div>
                <div className="col-span-2">
                  <Num className={inputCls} placeholder="السعر" value={r.price} onChange={(v) => setRow(i, { price: v })} />
                </div>
                <div className="col-span-3 text-sm font-bold text-gray-700 truncate">{fmt(x?.total || 0)}</div>
                <div className="col-span-1">
                  <button onClick={() => delRow(i)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-dashed" style={{ borderColor: an, color: tt }}>
            <Icon name="plus" size={16} style={{ color: an }} /> إضافة
          </button>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-600">إجمالي الخصم</span>
          <span className="text-sm font-bold" style={{ color: tt }}>
            {fmt(subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-600">
            <label className="cursor-pointer flex items-center gap-2">
              <input type="checkbox" checked={vat} onChange={(e) => setVat(e.target.checked)} className="accent-amber-500 h-4 w-4" />
              إضافة ضريبة القيمة المضافة (14%)
            </label>
          </span>
          <span className="text-sm font-bold" style={{ color: tt }}>
            {fmt(vatAmt)}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: `${tt}0A` }}>
          <span className="text-sm font-bold" style={{ color: tt }}>
            الإجمالي
          </span>
          <span className="text-lg font-bold" style={{ color: tt }}>
            {fmt(total)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex gap-2">
            {(["cash", "credit"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setPaymentType(m)}
                className="flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-colors"
                style={
                  paymentType === m
                    ? { backgroundColor: tt, color: "#fff", borderColor: tt }
                    : { borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fff" }
                }
              >
                {m === "cash" ? "نقدي" : "آجل"}
              </button>
            ))}
          </div>
          {paymentType === "credit" && (
            <div>
              <label className={labelCls}>المدفوع الآن (اختياري)</label>
              <Num className={inputCls} value={paidNow} onChange={setPaidNow} />
            </div>
          )}
        </div>

        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>الإجمالي الفرعي:</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>ضريبة القيمة المضافة:</span>
            <span className="font-medium">{fmt(vatAmt)}</span>
          </div>
          <div className="flex justify-between font-bold" style={{ color: tt }}>
            <span>الإجمالي:</span>
            <span>{fmt(total)}</span>
          </div>
          {rem > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>المتبقي آجل:</span>
              <span className="font-bold">{fmt(rem)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={save} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1" style={{ backgroundColor: an }} disabled={!ready}>
            <Icon name="check-circle2" size={16} /> حفظ الفاتورة
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

// invoice view (printable)
export function InvoiceView({
  kind,
  invoice,
  company,
  onClose,
  onDelete,
}: {
  kind: "sale" | "purchase";
  invoice: any;
  company: Company;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isSale = kind === "sale";
  const party = {
    name: invoice.customerName || invoice.supplierName || "",
    taxId: invoice.customerTaxId || invoice.supplierTaxId || "",
    region: invoice.customerRegion || invoice.supplierRegion || "",
  };
  const paid = Number(invoice.paid) || 0;
  const remaining = Math.max(0, (Number(invoice.total) || 0) - paid);
  const rate = invoice.vat && invoice.subtotal ? Number(invoice.vat) / Number(invoice.subtotal) : 0;
  const method = invoice.method === "cash" ? "نقدي" : "آجل";
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 overflow-y-auto" style={{ backgroundColor: "rgba(8,20,38,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8" dir="rtl">
        <div id="invoice-print-root" className="p-8" >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold" style={{ color: tt }}>
                {isSale ? "فاتورة بيع" : "فاتورة شراء"}
              </h3>
              <span className="text-sm text-gray-500">
                رقم: {isSale ? "INV-" : "PUR-"}
                {invoice.number}
              </span>
            </div>
            <div className="text-left">
              <div className="font-bold" style={{ color: tt }}>
                {company.companyName || "رويال للتوريدات العمومية"}
              </div>
              {(company.taxId || company.commercialReg) && (
                <div className="text-[11px] text-gray-400 mt-0.5">الرقم الضريبي: {company.taxId || "غير مسجل"} {company.commercialReg ? `· السجل التجاري: ${company.commercialReg}` : ""}</div>
              )}
              {company.address && <div className="text-[11px] text-gray-400">{company.address}</div>}
              {invoice.vat > 0 && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold" style={{ backgroundColor: `${LE}99`, color: tt }}>
                  فاتورة ضريبية
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">التاريخ:</div>
              <div className="font-medium">{fmtDate(invoice.date)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">{isSale ? "بيانات العميل" : "بيانات المورد"}</div>
              <div className="font-medium">{party.name}</div>
              <div className="text-xs text-gray-400">
                {party.taxId ? `الرقم الضريبي: ${party.taxId}` : "غير مسجل ضريبيًا"}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="text-xs text-gray-500 mb-1">المنطقة / طريقة الدفع</div>
              <div className="font-medium">{party.region || "غير محدد"}</div>
              <div className="text-xs text-gray-400">{method}</div>
            </div>
          </div>
          <table className="w-full text-sm mb-4" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr className="text-right" style={{ color: tt }}>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  الصنف
                </th>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  الكمية
                </th>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  سعر الوحدة
                </th>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  القيمة
                </th>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  الضريبة
                </th>
                <th className="py-2 border-b-2 font-semibold" style={{ borderColor: tt }}>
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody>
              {(invoice.rows || []).map((r: any, i: number) => {
                const sub = Number(r.qty) * Number(r.price);
                return (
                  <tr key={i} className="text-gray-700">
                    <td className="py-2 border-b border-gray-100">
                      {r.name}
                      <span className="text-[11px] text-gray-400"> / {r.unit || "قطعة"}</span>
                    </td>
                    <td className="py-2 border-b border-gray-100">{r.qty}</td>
                    <td className="py-2 border-b border-gray-100">{fmt(r.price)}</td>
                    <td className="py-2 border-b border-gray-100">{fmt(sub)}</td>
                    <td className="py-2 border-b border-gray-100">{fmt(sub * rate)}</td>
                    <td className="py-2 border-b border-gray-100 font-bold">{fmt(sub * (1 + rate))}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-sm text-gray-500">
                <td colSpan={4} className="py-1.5">
                  الإجمالي قبل الضريبة:
                </td>
                <td colSpan={2} className="py-1.5 font-medium">
                  {fmt(invoice.subtotal || 0)}
                </td>
              </tr>
              {invoice.vat > 0 && (
                <tr className="text-sm text-gray-500">
                  <td colSpan={4} className="py-1.5">
                    ضريبة القيمة المضافة (14%):
                  </td>
                  <td colSpan={2} className="py-1.5 font-medium">
                    {fmt(invoice.vat)}
                  </td>
                </tr>
              )}
              <tr className="text-base font-bold" style={{ color: tt }}>
                <td colSpan={4} className="py-1.5">
                  الإجمالي شامل الضريبة:
                </td>
                <td colSpan={2} className="py-1.5">
                  {fmt(invoice.total)}
                </td>
              </tr>
              <tr className="text-sm text-gray-600">
                <td colSpan={4} className="py-1.5">
                  المدفوع:
                </td>
                <td colSpan={2} className="py-1.5 font-medium" style={{ color: paid > 0 ? ui : "#6b7280" }}>
                  {fmt(paid)}
                </td>
              </tr>
              <tr className="text-sm font-bold" style={{ color: remaining > 0 ? ii : ui }}>
                <td colSpan={4} className="py-1.5">
                  المتبقي:
                </td>
                <td colSpan={2} className="py-1.5">
                  {fmt(remaining)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[10px] text-gray-300 leading-relaxed border-t border-gray-100 pt-3">
            هذا المستند سجل داخلي صادر من نظام إدارة الشركة. لاعتماد الفاتورة كفاتورة ضريبية إلكترونية رسميًا وفق القانون
            المصري، يجب تسجيلها عبر منظومة الفاتورة الإلكترونية التابعة لمصلحة الضرائب المصرية (eta.gov.eg).
          </p>
        </div>
        <div className="flex gap-2 justify-center px-8 pt-8 pb-8 border-t border-gray-100 ">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إغلاق
          </button>
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-1" style={{ backgroundColor: an }}>
            <Icon name="printer" size={15} /> طباعة
          </button>
          <button onClick={onDelete} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" style={{ color: ii }}>
            <Icon name="trash2" size={15} /> حذف الفاتورة
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatementView({
  kind,
  title,
  balanceLabel,
  balance,
  rows,
  onPayment,
  onClose,
}: {
  kind: "customer" | "supplier";
  title: string;
  balanceLabel: string;
  balance: number;
  rows: { date: string; desc: string; debit: number; credit: number }[];
  onPayment: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`كشف حساب: ${title}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">{balanceLabel}</span>
          <span className="text-lg font-bold" style={{ color: balance > 0 ? (kind === "customer" ? tt : ii) : ui }}>
            {fmt(balance)}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="text-right px-3 py-2 font-medium">التاريخ</th>
                <th className="text-right px-3 py-2 font-medium">البيان</th>
                <th className="text-right px-3 py-2 font-medium">مدين</th>
                <th className="text-right px-3 py-2 font-medium">دائن</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    لا توجد حركات بعد
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-50 text-gray-700">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-500">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2.5">{r.desc}</td>
                    <td className="px-3 py-2.5 font-medium">{r.debit ? fmt(r.debit) : "—"}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: ui }}>
                      {r.credit ? fmt(r.credit) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onPayment} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1" style={{ backgroundColor: an }}>
            <Icon name={kind === "customer" ? "arrow-up-circle" : "arrow-down-circle"} size={16} />
            {kind === "customer" ? "تحصيل دفعة" : "سداد دفعة"}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PaymentDialog({
  kind,
  name,
  balance,
  onSave,
  onClose,
}: {
  kind: "customer" | "supplier";
  name: string;
  balance: number;
  onSave: (amount: number, date: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const a = Number(amount);
  const ok = !isNaN(a) && a > 0;
  return (
    <Modal title={`${kind === "customer" ? "تحصيل دفعة من" : "سداد دفعة إلى"} ${name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-600">{kind === "customer" ? "الرصيد المستحق" : "المستحق له"}</span>
          <span className="text-lg font-bold" style={{ color: tt }}>
            {fmt(balance)}
          </span>
        </div>
        <div>
          <label className={labelCls}>المبلغ</label>
          <Num className={inputCls} value={amount} onChange={setAmount} autoFocus />
        </div>
        <div>
          <label className={labelCls}>التاريخ</label>
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {a > balance && balance > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">المبلغ أكبر من الرصيد المستحق، سيتم تسجيل المبلغ الزائد للتسوية.</p>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={() => ok && onSave(a, date)} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1" style={{ backgroundColor: an }} disabled={!ok}>
            <Icon name="check-circle2" size={16} /> تأكيد
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ManualMoveForm({
  onSave,
  onClose,
}: {
  onSave: (m: { dir: "in" | "out"; amount: number; category: string; note: string; date: string }) => void;
  onClose: () => void;
}) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const a = Number(amount);
  const ok = !isNaN(a) && a > 0;
  return (
    <Modal title="حركة خزينة يدوية" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["in", "وارد (إيداع)", ui],
              ["out", "منصرف (سحب)", ii],
            ] as const
          ).map(([m, label, color]) => (
            <button
              key={m}
              onClick={() => setDir(m)}
              className="px-3 py-2 rounded-lg text-sm font-bold border transition-colors"
              style={dir === m ? { backgroundColor: color, color: "#fff", borderColor: color } : { borderColor: "#e5e7eb", color: "#374151" }}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          <label className={labelCls}>التصنيف</label>
          <input className={inputCls} list="treasury-cats" placeholder="اختر أو اكتب تصنيفًا" value={category} onChange={(e) => setCategory(e.target.value)} />
          <datalist id="treasury-cats">
            {treasuryCats.map((c) => (
              <option style={{ color: "#374151" }} key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>المبلغ</label>
          <Num className={inputCls} value={amount} onChange={setAmount} />
        </div>
        <div>
          <label className={labelCls}>الملاحظات</label>
          <input className={inputCls} placeholder={dir === "in" ? "مثال: استرداد من مورد" : "مثال: دفع إيجار"} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>التاريخ</label>
          <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => ok && onSave({ dir, amount: a, category, note, date })} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1" style={{ backgroundColor: an }} disabled={!ok}>
            <Icon name="check-circle2" size={16} /> حفظ
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function RegionForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: { id: string; name: string } | null;
  onSave: (m: { data: { name: string } }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  return (
    <Modal title={initial ? "تعديل المنطقة" : "إضافة منطقة"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>اسم المنطقة</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => name.trim() && onSave({ data: { name: name.trim() } })} className="flex-1 px-4 py-3 rounded-lg text-sm font-bold text-white" style={{ backgroundColor: an }} disabled={!name.trim()}>
            حفظ
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CompanyForm({
  initial,
  onSave,
}: {
  initial?: Company;
  onSave: (m: { data: Company }) => void;
}) {
  const [f, setF] = useState({
    companyName: initial?.companyName || "",
    taxId: initial?.taxId || "",
    commercialReg: initial?.commercialReg || "",
    address: initial?.address || "",
    phone: initial?.phone || "",
  });
  const save = () => onSave({ data: { companyName: f.companyName.trim(), taxId: f.taxId.trim(), commercialReg: f.commercialReg.trim(), address: f.address.trim(), phone: f.phone.trim() } });
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
        هذه البيانات تظهر في رأس كل فاتورة بيع كبيانات الشركة، وهي مطلوبة لإصدار فاتورة تتوافق مع متطلبات الفاتورة
        الضريبية في مصر.
      </div>
      <div>
        <label className={labelCls}>اسم الشركة</label>
        <input className={inputCls} placeholder="رويال للتوريدات العمومية" value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>الرقم الضريبي</label>
        <input className={inputCls} dir="ltr" placeholder="رقم التسجيل الضريبي للشركة" value={f.taxId} onChange={(e) => setF({ ...f, taxId: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>السجل التجاري</label>
        <input className={inputCls} dir="ltr" value={f.commercialReg} onChange={(e) => setF({ ...f, commercialReg: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>العنوان</label>
        <input className={inputCls} placeholder="عنوان المقر أو الورشة" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>الهاتف</label>
        <input className={inputCls} dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <button onClick={save} className="w-full px-4 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1" style={{ backgroundColor: an }}>
        <Icon name="check-circle2" size={16} /> حفظ بيانات الشركة
      </button>
    </div>
  );
}