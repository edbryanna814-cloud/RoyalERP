"use client";

import { useEffect, useState } from "react";

function numClean(v: string): string {
  return (v || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[،٫]/g, ".")
    .replace(/[^0-9.\-]/g, "");
}

const COLUMNS = ["م", "الصنف", "الكمية", "سعر الوحدة", "عدد الوحدة (الكرتونة)", "ملاحظات", "الإجمالي"];

interface Row {
  id: number;
  item: string;
  qty: string;
  price: string;
  carton: string;
  notes: string;
}

function fmtMoney(n: number) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function newEmptyRows(): Row[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1, item: "", qty: "", price: "", carton: "", notes: "",
  }));
}

interface FieldProps {
  value: string;
  printMode: boolean;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  list?: string;
}

function Field({ value, printMode, onChange, type = "text", placeholder, list }: FieldProps) {
  return printMode ? (
    <div className="print-h">{value || "\u00A0"}</div>
  ) : (
    <input
      type={type === "number" ? "text" : type}
      value={value}
      placeholder={placeholder}
      list={list}
      {...(type === "number" ? { inputMode: "decimal" as const } : {})}
      onChange={(e) => onChange(type === "number" ? numClean(e.target.value) : e.target.value)}
    />
  );
}

export default function QuoteEditor() {
  const [meta, setMeta] = useState({ offerNumber: "", date: "", validUntil: "" });
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [rows, setRows] = useState<Row[]>(newEmptyRows);
  const [printMode, setPrintMode] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erp, setErp] = useState<{ customers: any[]; items: any[] }>({ customers: [], items: [] });

  useEffect(() => {
    (async () => {
      try {
        const [cj, ij] = await Promise.all([
          fetch("/api/erp/customers", { cache: "no-store" }),
          fetch("/api/erp/items", { cache: "no-store" }),
        ]);
        const cv = await cj.json();
        const iv = await ij.json();
        setErp({
          customers: Array.isArray(cv) ? cv : cv?.data ?? [],
          items: Array.isArray(iv) ? iv : iv?.data ?? [],
        });
      } catch {}
    })();
  }, []);

  const rowTotal = (r: Row) => (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
  const grandTotal = rows.reduce((s, r) => s + rowTotal(r), 0);
  const hasRows = rows.some((r) => (r.item || "").trim() !== "");

  const updateRow = (id: number, field: keyof Row, value: string) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, [field]: value };
        if (field === "item") {
          const m = erp.items.find((i) => i.name === value.trim());
          if (m && !(parseFloat(next.price) > 0)) next.price = String(m.salePrice ?? 0);
        }
        return next;
      })
    );

  const addRow = () =>
    setRows((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 1;
      return [...prev, { id: nextId, item: "", qty: "", price: "", carton: "", notes: "" }];
    });

  const removeRow = (id: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => window.print(), 60);
    const onAfter = () => setPrintMode(false);
    window.addEventListener("afterprint", onAfter);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", onAfter); };
  }, [printMode]);

  const save = async () => {
    if (!hasRows) { setMsg({ ok: false, text: "أضف صفاً واحداً على الأقل فيه صنف قبل الحفظ" }); return; }
    setSaving(true);
    try {
      const active = rows.filter((r) => (r.item || "").trim() !== "");
      const activeErp = active.map((r) => ({
        ...r,
        itemId: erp.items.find((i) => i.name === r.item.trim())?.id ?? null,
      }));
      const custId = erp.customers.find((c) => c.name === customer.name.trim())?.id ?? null;
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta, customer: { ...customer, customerId: custId }, rows: activeErp, grandTotal }),
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      setMsg({ ok: true, text: "تم حفظ العرض بنجاح. هتلاقيه في تبويب العروض المحفوظة." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "حدث خطأ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="sheet">
        <div className="brand-block">
          <div className="logo-circle">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 8L7 11L12 5L17 11L21 8L19 17H5L3 8Z" fill="#c9a13b" stroke="#c9a13b" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>رويال للتوريدات العمومية</h1>
          <div className="sub">ROYAL GENERAL SUPPLIES</div>
          <div className="gold-rule"></div>
        </div>

        <div className="badge">عرض سعر</div>

        <div className="meta-row">
          <div className="meta-fields">
            <div className="field-row">
              <label>رقم العرض:</label>
              <Field printMode={printMode} value={meta.offerNumber} placeholder="رقم العرض" onChange={(v: string) => setMeta((p) => ({ ...p, offerNumber: v }))} />
            </div>
            <div className="field-row">
              <label>التاريخ:</label>
              <Field printMode={printMode} type="date" value={meta.date} onChange={(v: string) => setMeta((p) => ({ ...p, date: v }))} />
            </div>
            <div className="field-row">
              <label>صالح حتى:</label>
              <Field printMode={printMode} type="date" value={meta.validUntil} onChange={(v: string) => setMeta((p) => ({ ...p, validUntil: v }))} />
            </div>
          </div>
        </div>

        <div className="customer-box">
          <div className="title">بيانات العميل</div>
          <div className="customer-grid">
            <div className="fld">
              <label>اسم العميل / الشركة</label>
              <Field printMode={printMode} value={customer.name} list="erp-customers"
                onChange={(v: string) =>
                  setCustomer((p) => {
                    const m = erp.customers.find((c) => c.name === v.trim());
                    return m
                      ? { ...p, name: v, phone: p.phone || m.phone || "", address: p.address || m.address || "" }
                      : { ...p, name: v };
                  })
                } />
            </div>
            <div className="fld">
              <label>رقم الهاتف</label>
              <Field printMode={printMode} type="tel" value={customer.phone} onChange={(v: string) => setCustomer((p) => ({ ...p, phone: v }))} />
            </div>
            <div className="fld full">
              <label>العنوان</label>
              <Field printMode={printMode} value={customer.address} onChange={(v: string) => setCustomer((p) => ({ ...p, address: v }))} />
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table className="items">
            <thead>
              <tr>
                {COLUMNS.map((c) => <th key={c}>{c}</th>)}
                <th className="no-print del-col"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="idx">{r.id}</td>
                  <td className="item-cell"><Field printMode={printMode} value={r.item} list="erp-items" onChange={(v: string) => updateRow(r.id, "item", v)} /></td>
                  <td><Field printMode={printMode} type="number" value={r.qty} onChange={(v: string) => updateRow(r.id, "qty", v)} /></td>
                  <td><Field printMode={printMode} type="number" value={r.price} onChange={(v: string) => updateRow(r.id, "price", v)} /></td>
                  <td><Field printMode={printMode} type="number" value={r.carton} onChange={(v: string) => updateRow(r.id, "carton", v)} /></td>
                  <td><Field printMode={printMode} value={r.notes} onChange={(v: string) => updateRow(r.id, "notes", v)} /></td>
                  <td className="total-cell">{rowTotal(r) > 0 ? fmtMoney(rowTotal(r)) : ""}</td>
                  <td className="no-print del-col">
                    <button type="button" className="row-del-btn" onClick={() => removeRow(r.id)} disabled={rows.length <= 1} title="حذف الصف">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!printMode && (
          <datalist id="erp-customers">
            {erp.customers.map((c) => <option key={c.id} value={c.name}>{c.phone || ""}</option>)}
          </datalist>
        )}
        {!printMode && (
          <datalist id="erp-items">
            {erp.items.map((i) => <option key={i.id} value={i.name}>{i.salePrice ? String(i.salePrice) + " ج.م" : ""}</option>)}
          </datalist>
        )}

        {!printMode && (
          <div className="add-row-bar">
            <button type="button" className="add-row-btn" onClick={addRow}>+ إضافة صف</button>
          </div>
        )}

        <div className="grand-total">
          <div className="label">إجمالي عرض<br />السعر</div>
          <div className="value-box">{fmtMoney(grandTotal)}</div>
        </div>

        {!printMode && (
          <div className="action-bar">
            <button className="action-btn save" onClick={save} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ العرض"}</button>
            <button className="action-btn pdf" onClick={() => setPrintMode(true)}>تصدير PDF</button>
          </div>
        )}
        {msg && !printMode && (
          <div className={(msg.ok ? "auth-success" : "auth-error") + " msg"}>{msg.text}</div>
        )}

        <div className="disclaimer">
          الأسعار بالجنيه المصري ولا تشمل ضريبة القيمة المضافة ما لم يُذكر خلاف ذلك. العرض قابل للتغيير بعد تاريخ الصلاحية المذكور أعلاه.
        </div>
        <div className="footer-rule"></div>
        <div className="copyright">رويال للتوريدات العمومية - هذا المستند عرض سعر ولا يعتبر فاتورة</div>
      </div>
    </div>
  );
}