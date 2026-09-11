"use client";

import { useEffect, useState } from "react";

interface Offer {
  id: string;
  meta: { offerNumber?: string; date?: string; validUntil?: string };
  customer: { name?: string; phone?: string; address?: string };
  rows: any[];
  grandTotal: number;
  savedAt: string;
}

function fmtMoney(n: number) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OffersList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fSearch, setFSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/offers", { cache: "no-store" });
      const data = await res.json();
      setOffers(data.offers || []);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
    setOffers((prev) => prev.filter((o) => o.id !== id));
    setMsg({ ok: true, text: "تم حذف العرض" });
  };

  const visible = offers.filter((o) => {
    const d = (o.meta.date || o.savedAt || "").slice(0, 10);
    if (fFrom && d < fFrom) return false;
    if (fTo && d > fTo) return false;
    if (fSearch && !(o.meta.offerNumber || "").includes(fSearch.trim()) && !(o.customer.name || "").includes(fSearch.trim())) return false;
    return true;
  });

  const favStyle = { padding: "7px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 8 } as const;

  return (
    <div className="page-wrap">
      <div className="sheet">
        <div className="brand-block">
          <div className="logo-circle">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 8L7 11L12 5L17 11L21 8L19 17H5L3 8Z" fill="#c9a13b" stroke="#c9a13b" strokeWidth="0.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>العروض المحفوظة</h1>
          <div className="sub">SAVED QUOTES &amp; EXCEL EXPORT</div>
          <div className="gold-rule"></div>
        </div>

        <div className="export-toolbar" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: "#555" }}>
            عدد العروض المحفوظة: <b>{offers.length}</b>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="export-btn" href="/api/export">
              تصدير العروض إلى Excel
            </a>
            <a className="export-btn" href="/api/export-all">
              تصدير كل بيانات الموقع Excel
            </a>
          </div>
        </div>

        {msg && <div className={(msg.ok ? "auth-success" : "auth-error") + " msg"}>{msg.text}</div>}

        <div className="export-toolbar" style={{ marginTop: 12, alignItems: "center" }}>
          <input type="date" dir="ltr" style={favStyle} title="من تاريخ" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          <input type="date" dir="ltr" style={favStyle} title="إلى تاريخ" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          <input type="text" style={{ ...favStyle, minWidth: 180 }} dir="rtl" placeholder="ابحث برقم العرض أو اسم العميل..." value={fSearch} onChange={(e) => setFSearch(e.target.value)} />
          {offers.length > 0 && <div style={{ fontSize: 13, color: "#555" }}>نتيجة: <b>{visible.length}</b> من {offers.length}</div>}
        </div>

        {loading ? (
          <div className="empty-state">جاري التحميل...</div>
        ) : offers.length === 0 ? (
          <div className="empty-state">
            لسه معملتش أي عرض محفوظ. روح لتبويب "عرض سعر"، اعمل عرض واضغط "حفظ العرض".
          </div>
        ) : (
          <div className="quotes-table-wrap">
            <table className="quotes">
              <thead>
                <tr>
                  <th>رقم العرض</th><th>العميل</th><th>التاريخ</th><th>الإجمالي</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#999", padding: 20 }}>لا توجد نتائج مطابقة للفلاتر</td></tr>
                ) : visible.map((o) => (
                  <tr key={o.id}>
                    <td>{o.meta.offerNumber || "-"}</td>
                    <td>{o.customer.name || "-"}</td>
                    <td>{o.meta.date || "-"}</td>
                    <td>{fmtMoney(o.grandTotal)}</td>
                    <td>
                      <a className="row-action-btn" href={`/api/export?id=${o.id}`}>تصدير Excel</a>
                      <button className="row-action-btn danger" onClick={() => del(o.id)}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="disclaimer" style={{ marginTop: 24 }}>
          التصدير يشمل كل العروض المحفوظة في حسابك.
        </div>
      </div>
    </div>
  );
}