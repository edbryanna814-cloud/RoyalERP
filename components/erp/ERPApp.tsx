"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ERP_CSS, INVOICE_PRINT_CSS } from "./tailwind.css";
import { api, Icon, Logo, fmt, fmtDate, StatCard, Badge, EmptyState, ConfirmDialog, DropSelect, inputCls, tt, Gb, an, ui, ii, LE, Ib } from "./ui";
import {
  CustomerForm,
  SupplierForm,
  ProductForm,
  StockAdjustForm,
  InvoiceForm,
  InvoiceView,
  StatementView,
  PaymentDialog,
  ManualMoveForm,
  RegionForm,
  CompanyForm,
} from "./forms";
import type { InvoiceDraft } from "./forms";
import QuoteEditor from "@/components/quotes/QuoteEditor";
import OffersList from "@/components/quotes/OffersList";
import { ALL_PAGES, DEFAULT_ROLE_PAGES } from "@/lib/pages";

type Mov = { id: string; type: string; sign: number; amount: number; category: string; note: string; date: string };
type Inv = {
  id: string;
  number: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerRegion?: string;
  supplierId?: string;
  supplierName?: string;
  subtotal: number;
  vat: number;
  total: number;
  paid: number;
  method?: string;
  rows: { itemId: string; name: string; unit: string; qty: number; price: number }[];
  createdAt: string;
};
type Party = {
  id: string;
  name: string;
  phone?: string;
  region?: string;
  taxId?: string;
  address?: string;
  creditBalance?: number;
  payableBalance?: number;
};
type Item = { id: string; name: string; category?: string; unit?: string; qty?: number; costPrice?: number; salePrice?: number; reorderLevel?: number };
type Company = { companyName?: string; taxId?: string; commercialReg?: string; address?: string; phone?: string };

type ModalState =
  | { type: "customer-form"; id?: string }
  | { type: "supplier-form"; id?: string }
  | { type: "product-form"; id?: string }
  | { type: "stock-adjust"; id: string }
  | { type: "invoice-form"; kind: "sale" | "purchase"; partyId?: string }
  | { type: "invoice-view"; kind: "sale" | "purchase"; id: string }
  | { type: "statement"; kind: "customer" | "supplier"; id: string }
  | { type: "payment"; kind: "customer" | "supplier"; id: string }
  | { type: "manual-move" }
  | { type: "region-form"; id?: string };

const nav = ALL_PAGES.filter((p) => p.key !== "users");
const USERS_NAV = { key: "users", label: "المستخدمون", icon: "users" };

export function ERPApp() {
  const router = useRouter();
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [user, setUser] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState({ sales: "", purchases: "", items: "", customers: "", suppliers: "" });
  const [trFilter, setTrFilter] = useState("all");
  const [f, setF] = useState({
    salesFrom: "", salesTo: "", salesRegion: "", salesStatus: "",
    purchasesFrom: "", purchasesTo: "", purchasesStatus: "",
    itemsCat: "",
    customersRegion: "", suppliersRegion: "",
    movesFrom: "", movesTo: "", movesCat: "",
  });
  const [dashFrom, setDashFrom] = useState("");
  const [dashTo, setDashTo] = useState("");
  const [navOpen, setNavOpen] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [role, setRole] = useState<string>("sales");
  const [pages, setPages] = useState<string[]>([]);
  const [adminTab, setAdminTab] = useState<"users" | "roles">("users");

  type DB = {
    regions: { id: string; name: string }[];
    customers: Party[];
    suppliers: Party[];
    items: Item[];
    sales: Inv[];
    purchases: Inv[];
    movements: Mov[];
    company: Company;
    offers: any[];
  };
  const [db, setDb] = useState<DB>({
    regions: [],
    customers: [],
    suppliers: [],
    items: [],
    sales: [],
    purchases: [],
    movements: [],
    company: {},
    offers: [],
  });

  const showToast = (msg: string, err?: boolean) => {
    setToast({ msg, err });
    window.setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    const calls: any[] = [
      ["regions"], 
      ["customers"], 
      ["suppliers"], 
      ["items"], 
      ["sales"], 
      ["purchases"], 
      ["movements"], 
      ["company"], 
      ["offers"],
    ];
    for (let t = 0; t < 2; t++) {
      const results = await Promise.allSettled(
        calls.map(async ([res, q]) => {
          if (res === "company") return api("GET", "company");
          if (res === "offers") {
            const r = await fetch("/api/offers");
            const j = await r.json().catch(() => ({}));
            return { ok: r.ok, data: j.offers ?? [] };
          }
          return api("GET", res, undefined, q);
        })
      );
      const failed = results.some(
        (r) => r.status === "rejected" || !(r as any).value?.ok
      );
      if (!failed) {
        const vals = results.map((r: any) => r.value?.data ?? {});
        setDb({
          regions: vals[0] ?? [],
          customers: vals[1] ?? [],
          suppliers: vals[2] ?? [],
          items: vals[3] ?? [],
          sales: vals[4] ?? [],
          purchases: vals[5] ?? [],
          movements: vals[6] ?? [],
          company: vals[7]?.company ?? {},
          offers: vals[8] ?? [],
        });
        setLoadErr(false);
        return;
      }
    }
    setLoadErr(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch("/api/me");
        if (res.status === 401) {
          await fetch("/api/refresh");
          res = await fetch("/api/me");
        }
if (res.ok) {
          try {
            const j = await res.json();
            setUser(j.user?.fullName || j.user?.name || "");
            setRole(j.user?.role || "sales");
            setPages(Array.isArray(j.user?.pages) ? j.user.pages : []);
          } catch {}
          await load();
        } else {
          router.replace("/login");
        }
      } catch {
        setLoadErr(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [load, router]);

  const navKeys = pages.length
    ? pages.filter((k) => ALL_PAGES.some((p) => p.key === k))
    : ALL_PAGES.map((p) => p.key).filter((k) => DEFAULT_ROLE_PAGES[role]?.includes(k));
  useEffect(() => {
    setTab((t) => (navKeys.includes(t) ? t : navKeys[0] || "dashboard"));
  }, [navKeys.join(",")]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  const delGuard = (kind: "customer" | "supplier" | "item" | "region", id: string, name: string) => {
    const sales = db.sales;
    const purchases = db.purchases;
    if (kind === "customer") {
      if (sales.some((s) => s.customerId === id)) {
        showToast("لا يمكن حذف عميل مرتبط بفواتير بيع", true);
        return;
      }
      setConfirm({
        message: `هل تريد حذف العميل ${name}؟`,
        action: async () => {
          const r = await api("DELETE", "customers", undefined, { id });
          if (!r.ok) return showToast("لا يمكن حذف عميل مرتبط بفواتير بيع", true);
          showToast("تم حذف العميل");
          load();
        },
      });
    } else if (kind === "supplier") {
      if (purchases.some((s) => s.supplierId === id)) {
        showToast("لا يمكن حذف مورد مرتبط بفواتير شراء", true);
        return;
      }
      setConfirm({
        message: `هل تريد حذف المورد ${name}؟`,
        action: async () => {
          const r = await api("DELETE", "suppliers", undefined, { id });
          if (!r.ok) return showToast("لا يمكن حذف مورد مرتبط بفواتير شراء", true);
          showToast("تم حذف المورد");
          load();
        },
      });
    } else if (kind === "item") {
      const used = [...sales, ...purchases].some((i) => (i.rows || []).some((r) => r.itemId === id));
      if (used) {
        showToast("لا يمكن حذف صنف مرتبط بفواتير سابقة", true);
        return;
      }
      setConfirm({
        message: `هل تريد حذف الصنف ${name}؟`,
        action: async () => {
          const r = await api("DELETE", "items", undefined, { id });
          if (!r.ok) return showToast("لا يمكن حذف صنف مرتبط بفواتير سابقة", true);
          showToast("تم حذف الصنف");
          load();
        },
      });
    } else {
      const used = db.customers.some((c) => c.region === name) || sales.some((s) => s.customerRegion === name);
      if (used) {
        showToast("لا يمكن حذف منطقة مرتبطة بعملاء أو فواتير", true);
        return;
      }
      setConfirm({
        message: `هل تريد حذف منطقة ${name}؟`,
        action: async () => {
          const r = await api("DELETE", "regions", undefined, { id });
          if (!r.ok) return showToast("لا يمكن حذف منطقة مرتبطة بعملاء أو فواتير", true);
          showToast("تم حذف المنطقة");
          load();
        },
      });
    }
  };

  const delInvoice = (kind: "sale" | "purchase", inv: Inv) => {
    setConfirm({
      message: `هل تريد حذف فاتورة ${kind === "sale" ? "البيع" : "الشراء"} ${(kind === "sale" ? "INV-" : "PUR-") + inv.number}؟ سيتم التراجع عن أثرها على المخزون والحسابات.`,
      action: async () => {
        const r = await api("DELETE", kind === "sale" ? "sales" : "purchases", undefined, { id: inv.id });
        if (r.ok) {
          showToast(kind === "sale" ? "تم حذف فاتورة البيع والتراجع عن أثرها" : "تم حذف فاتورة الشراء والتراجع عن أثرها");
          setModal(null);
        } else {
          showToast("تعذر حذف الفاتورة", true);
        }
        load();
      },
    });
  };

  const saveInvoice = async (d: InvoiceDraft) => {
    const body = {
      date: d.date,
      vat: d.vat,
      paid: d.paidNow,
      rows: d.rows.map((r) => ({ itemId: r.itemId, qty: r.qty, price: r.price })),
    };
    if (d.kind === "sale") {
      const r = await api("POST", "sales", { ...body, customerId: d.partyId, region: d.region });
      if (r.ok) {
        const n = r.data?.invoice?.number ?? "";
        showToast(`تم حفظ فاتورة البيع ${"INV-" + n}`);
      } else {
        showToast(r.data?.error || "تعذر حفظ الفاتورة، تأكد من الكميات المتاحة", true);
      }
    } else {
      const r = await api("POST", "purchases", { ...body, supplierId: d.partyId });
      if (r.ok) {
        const n = r.data?.invoice?.number ?? "";
        showToast(`تم حفظ فاتورة الشراء ${"PUR-" + n}`);
      } else {
        showToast(r.data?.error || "تعذر حفظ الفاتورة", true);
      }
    }
    setModal(null);
    await load();
  };

  // ---------- derived ----------
  const dash = useMemo(() => {
    const sum = (a: Inv[]) => a.reduce((s, x) => s + (Number(x.total) || 0), 0);
    const fd = (d?: string) => (d || "").slice(0, 10);
    const inRange = (d?: string) => (!dashFrom || fd(d) >= dashFrom) && (!dashTo || fd(d) <= dashTo);
    const sales = db.sales.filter((s) => inRange(s.date));
    const purchases = db.purchases.filter((s) => inRange(s.date));
    const moves = db.movements.filter((m) => inRange(m.date));
    const offers = db.offers.filter((o) => inRange(fd(o.meta?.date) || fd(o.savedAt)));
    const totalSales = sum(sales);
    const totalPurchases = sum(purchases);
    const treasury = moves.reduce((s, m) => s + (m.sign || 1) * (Number(m.amount) || 0), 0);
    const creditDue = db.customers.reduce((s, c) => s + (Number(c.creditBalance) || 0), 0);
    const payable = db.suppliers.reduce((s, c) => s + (Number(c.payableBalance) || 0), 0);
    const lowStock = db.items.filter((i) => (Number(i.qty) || 0) <= (Number(i.reorderLevel) || 0));
    const regionMap: Record<string, number> = {};
    sales.forEach((s) => {
      const k = s.customerRegion || "غير محدد";
      regionMap[k] = (regionMap[k] || 0) + (Number(s.total) || 0);
    });
    const regionChart = Object.entries(regionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const recent = [...sales].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5);
    const recentPurchases = [...purchases].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5);
    const recentMoves = [...moves].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5);
    const recentOffers = [...offers].sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || "")).slice(0, 5);
    const custMap: Record<string, number> = {};
    sales.forEach((s) => {
      const k = s.customerId || s.customerName || "غير محدد";
      custMap[k] = (custMap[k] || 0) + (Number(s.total) || 0);
    });
    const nameOf = (k: string) => db.customers.find((c) => c.id === k)?.name || k;
    const topCustomers = Object.entries(custMap)
      .map(([k, v]) => ({ name: nameOf(k), value: v }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const itemMap: Record<string, { name: string; qty: number }> = {};
    sales.forEach((s) =>
      (s.rows || []).forEach((r) => {
        const k = r.itemId || r.name;
        itemMap[k] = { name: r.name, qty: (itemMap[k]?.qty || 0) + (Number(r.qty) || 0) };
      })
    );
    const topItems = Object.entries(itemMap)
      .map(([, v]) => v)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    return { totalSales, totalPurchases, treasury, creditDue, payable, lowStock, regionChart, recent, recentPurchases, recentMoves, recentOffers, topCustomers, topItems, filtered: !!dashFrom || !!dashTo };
  }, [db, dashFrom, dashTo]);

  const fltSales = useMemo(
    () => {
      const fd = (d?: string) => (d || "").slice(0, 10);
      return db.sales.filter(
        (s) =>
          (!f.salesFrom || fd(s.date) >= f.salesFrom) &&
          (!f.salesTo || fd(s.date) <= f.salesTo) &&
          (!f.salesRegion || (s.customerRegion || "غير محدد") === f.salesRegion) &&
          (f.salesStatus === "paid" ? Number(s.total) - Number(s.paid) <= 0 : f.salesStatus === "partial" ? Number(s.total) - Number(s.paid) > 0 : true) &&
          (!q.sales ||
            (s.number || "").includes(q.sales.trim()) ||
            (s.customerName || "").includes(q.sales.trim()))
      );
    },
    [db.sales, q.sales, f.salesFrom, f.salesTo, f.salesRegion, f.salesStatus]
  );
  const fltPurchases = useMemo(
    () => {
      const fd = (d?: string) => (d || "").slice(0, 10);
      return db.purchases.filter(
        (s) =>
          (!f.purchasesFrom || fd(s.date) >= f.purchasesFrom) &&
          (!f.purchasesTo || fd(s.date) <= f.purchasesTo) &&
          (f.purchasesStatus === "paid" ? Number(s.total) - Number(s.paid) <= 0 : f.purchasesStatus === "partial" ? Number(s.total) - Number(s.paid) > 0 : true) &&
          (!q.purchases ||
            (s.number || "").includes(q.purchases.trim()) ||
            (s.supplierName || "").includes(q.purchases.trim()))
      );
    },
    [db.purchases, q.purchases, f.purchasesFrom, f.purchasesTo, f.purchasesStatus]
  );
  const fltItems = useMemo(
    () =>
      db.items.filter(
        (i) =>
          (!f.itemsCat || (i.category || "غير محدد") === f.itemsCat) &&
          (!q.items || i.name.includes(q.items.trim()) || (i.category || "").includes(q.items.trim()))
      ),
    [db.items, q.items, f.itemsCat]
  );
  const fltCustomers = useMemo(
    () =>
      db.customers.filter(
        (c) =>
          (!f.customersRegion || (c.region || "غير محدد") === f.customersRegion) &&
          (!q.customers || c.name.includes(q.customers.trim()) || (c.phone || "").includes(q.customers.trim()))
      ),
    [db.customers, q.customers, f.customersRegion]
  );
  const fltSuppliers = useMemo(
    () =>
      db.suppliers.filter(
        (s) =>
          (!f.suppliersRegion || (s.region || "غير محدد") === f.suppliersRegion) &&
          (!q.suppliers || s.name.includes(q.suppliers.trim()) || (s.phone || "").includes(q.suppliers.trim()))
      ),
    [db.suppliers, q.suppliers, f.suppliersRegion]
  );
  const fltMoves = useMemo(
    () => {
      const fd = (d?: string) => (d || "").slice(0, 10);
      return db.movements.filter(
        (m) =>
          (trFilter === "all" ? true : trFilter === "in" ? m.sign >= 0 : m.sign < 0) &&
          (!f.movesFrom || fd(m.date) >= f.movesFrom) &&
          (!f.movesTo || fd(m.date) <= f.movesTo) &&
          (!f.movesCat || (m.category || "غير محدد") === f.movesCat)
      );
    },
    [db.movements, trFilter, f.movesFrom, f.movesTo, f.movesCat]
  );

  const searchBox = (val: string, onChange: (v: string) => void, placeholder: string) => (
    <div className="relative w-full md:w-72">
      <Icon name="search" size={16} className="absolute right-3 top-2.5 text-gray-300" />
      <input
        className="w-full border border-gray-200 rounded-lg pr-9 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        placeholder={placeholder}
        value={val}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  const dateInp = (val: string, set: (v: string) => void, title: string) => (
    <input
      type="date"
      dir="ltr"
      title={title}
      className={inputCls}
      style={{ color:"#000", padding: "7px 10px", fontSize: 13 }}
      value={val}
      onChange={(e) => set(e.target.value)}
    />
  );

  const selInp = (val: string, set: (v: string) => void, options: string[]) => (
    <div style={{ minWidth: 150 }}>
      <DropSelect
        compact
        value={val}
        onChange={set}
        options={[{ value: "", label: "الكل" }, ...options.map((o) => ({ value: o, label: o }))]}
      />
    </div>
  );

  const clearBtn = (onClick: () => void) => (
    <button onClick={onClick} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: Gb, color: tt }}>
      تفريغ
    </button>
  );

  const statusSel = (val: string, set: (v: string) => void) => (
    <div style={{ minWidth: 170 }}>
      <DropSelect
        compact
        value={val}
        onChange={set}
        options={[
          { value: "", label: "حالة الدفع: الكل" },
          { value: "paid", label: "مدفوعة بالكامل" },
          { value: "partial", label: "بها متبقي" },
        ]}
      />
    </div>
  );

  const distinct = (arr: (string | undefined)[]) => [...new Set(arr.map((v) => v || "غير محدد"))] as string[];

  const addBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white flex items-center gap-1 shrink-0"
      style={{ backgroundColor: an }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tt)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = an)}
    >
      <Icon name="plus" size={16} />
      {label}
    </button>
  );

  const tblHead = (cols: string[]) => (
    <thead>
      <tr className="bg-gray-50 text-gray-500">
        {cols.map((c) => (
          <th key={c} className="text-right px-3 py-2 font-medium">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  const invoiceRows = (kind: "sale" | "purchase", rows: Inv[]) => (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        {tblHead(["رقم الفاتورة", "التاريخ", kind === "sale" ? "المنطقة" : "المورد", "الإجمالي", "الدفع", ""])}
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <EmptyState
                  icon={kind === "sale" ? "shopping-cart" : "package-plus"}
                  title={kind === "sale" ? "لا توجد فواتير بيع بعد" : "لا توجد فواتير شراء بعد"}
                  hint={kind === "sale" ? "ابدأ بإنشاء أول فاتورة بيع لعميل." : "ابدأ بتسجيل أول فاتورة شراء من مورد."}
                />
              </td>
            </tr>
          ) : (
            rows.map((d) => {
              const rem = Math.max(0, (Number(d.total) || 0) - (Number(d.paid) || 0));
              const fully = rem <= 0;
              return (
                <tr key={d.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setModal({ type: "invoice-view", kind, id: d.id })}
                      className="font-bold"
                      style={{ color: tt }}
                    >
                      {(kind === "sale" ? "INV-" : "PUR-") + d.number}
                    </button>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {kind === "sale" ? d.customerName : d.supplierName}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                  <td className="px-3 py-3 text-gray-500">{kind === "sale" ? d.customerRegion || "غير محدد" : d.supplierName || "—"}</td>
                  <td className="px-3 py-3 font-bold text-gray-800 whitespace-nowrap">{fmt(d.total)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {fully ? (
                      <Badge tone="green">{d.method === "cash" ? "نقدي" : "مدفوع"}</Badge>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                        متبقي: {fmt(rem)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setModal({ type: "invoice-view", kind, id: d.id })}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="عرض"
                      >
                        <Icon name="eye" size={20} />
                      </button>
                      <button
                        onClick={() => delInvoice(kind, d)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="حذف"
                      >
                        <Icon name="trash2" size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  const customersTable = (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        {tblHead(["الاسم", "الهاتف", "المنطقة", "الرصيد الآجل", ""])}
        <tbody>
          {fltCustomers.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyState icon="users" title="لا يوجد عملاء بعد" hint="أضف أول عميل لبدء إنشاء فواتير البيع." />
              </td>
            </tr>
          ) : (
            fltCustomers.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-3 py-3">
                  <div className="font-semibold text-gray-800">{c.name}</div>
                </td>
                <td className="px-3 py-3 text-gray-500" dir="ltr" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {c.phone || "—"}
                </td>
                <td className="px-3 py-3 text-gray-500">{c.region || "غير محدد"}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {Number(c.creditBalance) > 0 ? (
                    <Badge tone="red">{fmt(c.creditBalance)}</Badge>
                  ) : (
                    <Badge tone="green">لا يوجد رصيد</Badge>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setModal({ type: "invoice-form", kind: "sale", partyId: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="فاتورة بيع"
                    >
                      <Icon name="shopping-cart" size={20} />
                    </button>
                    <button
                      onClick={() => setModal({ type: "statement", kind: "customer", id: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="كشف حساب"
                    >
                      <Icon name="clipboard-list" size={20} />
                    </button>
                    <button
                      onClick={() => setModal({ type: "customer-form", id: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="تعديل"
                    >
                      <Icon name="pencil" size={20} />
                    </button>
                    <button
                      onClick={() => delGuard("customer", c.id, c.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="حذف"
                    >
                      <Icon name="trash2" size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const suppliersTable = (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        {tblHead(["الاسم", "الهاتف", "المستحق له", ""])}
        <tbody>
          {fltSuppliers.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <EmptyState icon="building2" title="لا يوجد موردون بعد" hint="أضف أول مورد لبدء تسجيل فواتير الشراء." />
              </td>
            </tr>
          ) : (
            fltSuppliers.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-3 py-3 font-semibold text-gray-800">{c.name}</td>
                <td className="px-3 py-3 text-gray-500" dir="ltr" style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  {c.phone || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {Number(c.payableBalance) > 0 ? (
                    <Badge tone="red">{fmt(c.payableBalance)}</Badge>
                  ) : (
                    <Badge tone="green">لا يوجد مستحق</Badge>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setModal({ type: "invoice-form", kind: "purchase", partyId: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="فاتورة شراء"
                    >
                      <Icon name="package-plus" size={20} />
                    </button>
                    <button
                      onClick={() => setModal({ type: "statement", kind: "supplier", id: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="كشف حساب"
                    >
                      <Icon name="clipboard-list" size={16} />
                    </button>
                    <button
                      onClick={() => setModal({ type: "supplier-form", id: c.id })}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="تعديل"
                    >
                      <Icon name="pencil" size={16} />
                    </button>
                    <button
                      onClick={() => delGuard("supplier", c.id, c.name)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="حذف"
                    >
                      <Icon name="trash2" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: Gb, fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}
      >
        <style>{ERP_CSS}</style>
        <Logo size={56} />
        <div className="text-sm text-gray-500">جارِ تحميل بيانات النظام...</div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="erp-root"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: Gb,
        fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <style>{ERP_CSS}</style>
      {modal && modal.type === "invoice-view" && <style>{INVOICE_PRINT_CSS}</style>}

      <header style={{ flexShrink: 0, backgroundColor: tt }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo />
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight truncate" style={{ color: "#fff" }}>
              {db.company.companyName || "رويال للتوريدات العمومية"}
            </div>
            <div className="text-xs leading-tight" style={{ color: LE }}>
              نظام إدارة المبيعات والمخازن والحسابات
            </div>
          </div>
          <div className="flex items-center gap-1" style={{ marginInlineStart: "auto" }}>
            {user && (
              <button
                onClick={logout}
                className="px-5 py-2 rounded-lg text-xs whitespace-nowrap"
style={{ background: ii, color: "#fff" }}
onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#8c1a11")}
onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = ii)}
              >
                خروج
              </button>
            )}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside
          style={{
            width: navOpen ? "auto" : 64,
            flexShrink: 0,
            backgroundColor: Ib,
            overflowY: "auto",
          }}
        >
          <div className="px-3 py-2 flex" style={{ justifyContent: navOpen ? "flex-end" : "center" }}>
            <button
              onClick={() => setNavOpen((v) => !v)}
              title={navOpen ? "إخفاء القائمة" : "إظهار القائمة"}
              className="p-2 rounded-lg"
              style={{ color: "rgba(255,255,255,0.85)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {navOpen ? (
                <Icon name="x" size={30} />
              ) : (
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
          {navOpen && (
            <div className="px-2 pb-2 space-y-1">
              {[
                ...nav.filter((n) => navKeys.includes(n.key)),
                ...(navKeys.includes("users") ? [USERS_NAV] : []),
              ].map((n) => {
                const active = tab === n.key;
                return (
                  <button
                    key={n.key}
                    onClick={() => setTab(n.key)}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-colors"
                    style={
                      active
                        ? { backgroundColor: an, color: Ib, fontWeight: 700 }
                        : { color: "#fff" }
                    }
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "";
                    }}
                  >
                    <Icon name={n.icon} size={20} />
                    {n.label}
                  </button>
                );
              })}
            </div>
          )}
        </aside>

      <main className="px-4 py-5" style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
        {loadErr && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}>
            <span>تعذر تحميل البيانات من الخادم. اضغط إعادة المحاولة، أو راجع اتصالك بالإنترنت.</span>
            <button
              onClick={() => { setLoadErr(false); load(); }}
              className="shrink-0 rounded-lg px-3 py-1.5 font-semibold"
              style={{ backgroundColor: "#991B1B", color: "#fff" }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}
        {tab === "dashboard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                لوحة التحكم
              </h2>
              {/* {addBtn("فاتورة بيع", () => setModal({ type: "invoice-form", kind: "sale" }))} */}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: tt }}>من تاريخ</label>
                <input type="date" className={inputCls} style={{ padding: "8px 10px" }} dir="ltr"
                  value={dashFrom} onChange={(e) => setDashFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: tt }}>إلى تاريخ</label>
                <input type="date" className={inputCls} style={{ padding: "8px 10px" }} dir="ltr"
                  value={dashTo} onChange={(e) => setDashTo(e.target.value)} />
              </div>
              <button onClick={() => { setDashFrom(""); setDashTo(""); }}
                className="px-3 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: Gb, color: tt }}>
                عرض الكل
              </button>
              {dash.filtered && (
                <span className="text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{ backgroundColor: LE + "44", color: tt }}>
                  عرض بيانات {dashFrom && "من " + dashFrom} {dashTo && "حتى " + dashTo}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard icon="shopping-cart" label="إجمالي المبيعات" value={fmt(dash.totalSales)} tone="navy" />
              <StatCard icon="package-plus" label="إجمالي المشتريات" value={fmt(dash.totalPurchases)} tone="gold" />
              <StatCard icon="wallet" label={dash.filtered ? "صافي حركات الخزينة (الفترة)" : "رصيد الخزينة"} value={fmt(dash.treasury)} tone="green" />
              <StatCard icon="users" label="مستحق من العملاء (آجل)" value={fmt(dash.creditDue)} tone="red" />
              <StatCard icon="building2" label="مستحق لموردين" value={fmt(dash.payable)} tone="red" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: tt }}>
                  <Icon name="map-pin" size={16} />
                  المبيعات حسب المنطقة
                </h3>
                {dash.regionChart.length === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center">لا توجد بيانات بعد</div>
                ) : (
                  <div className="space-y-2">
                    {dash.regionChart.map((r) => {
                      const max = Math.max(1, ...dash.regionChart.map((x) => x.value));
                      return (
                        <div key={r.name} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-gray-500 truncate shrink-0">{r.name}</div>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className="h-3 rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: an }} />
                          </div>
                          <div className="w-24 text-xs text-gray-600 text-left shrink-0">{fmt(r.value)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: tt }}>
                  <Icon name="alert-triangle" size={16} style={{ color: "#d97706" }} />
                  أصناف تحتاج إعادة طلب
                </h3>
                {dash.lowStock.length === 0 ? (
                  <div className="text-sm text-gray-400 py-6 text-center">لا توجد أصناف منخفضة حاليًا</div>
                ) : (
                  <div className="space-y-2">
                    {dash.lowStock.slice(0, 6).map((i) => (
                      <div key={i.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold text-gray-700">{i.name}</span>
                          <span className="text-xs text-gray-400 mr-1.5">
                            / {i.unit || "قطعة"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            متبقي: {i.qty ?? 0} من حد {i.reorderLevel ?? 0}
                          </span>
                          <Badge tone="red">منخفض</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dash.lowStock.length > 6 && (
                  <button onClick={() => setTab("inventory")} className="text-xs mt-3 font-medium hover:underline" style={{ color: tt }}>
                    عرض كل الأصناف المنخفضة...
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: tt }}>
                <Icon name="shopping-cart" size={16} />
                آخر فواتير البيع
              </h3>
              {dash.recent.length === 0 ? (
                <div className="text-sm text-gray-400 py-6 text-center">لا توجد فواتير بعد</div>
              ) : (
                <div className="space-y-2">
                  {dash.recent.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setModal({ type: "invoice-view", kind: "sale", id: s.id })}
                      className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold" style={{ color: tt }}>
                          {"INV-" + s.number}
                        </span>
                        <span className="text-gray-600">{s.customerName}</span>
                        <span className="text-xs text-gray-400">{fmtDate(s.date)}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{fmt(s.total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ListCard title="آخر فواتير الشراء" icon="package-plus" items={dash.recentPurchases} empty="لا توجد مشتريات بعد"
                render={(s) => (
                  <button key={s.id} onClick={() => setModal({ type: "invoice-view", kind: "purchase", id: s.id })}
                    className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2 py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold" style={{ color: tt }}>{"INV-" + s.number}</span>
                      <span className="text-gray-600">{s.supplierName}</span>
                      <span className="text-xs text-gray-400">{fmtDate(s.date)}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{fmt(s.total)}</span>
                  </button>
                )} />
              <ListCard title="حركات الخزينة الأخيرة" icon="wallet" items={dash.recentMoves} empty="لا توجد حركات بعد"
                render={(m) => (
                  <div key={m.id} className="w-full flex items-center justify-between text-sm px-2 py-2">
                    <div className="flex items-center gap-3">
                      <Icon name={m.sign >= 0 ? "arrow-up-circle" : "arrow-down-circle"} size={16}
                        style={{ color: m.sign >= 0 ? ui : ii }} />
                      <div>
                        <div className="font-semibold text-gray-700">{m.category || m.type}</div>
                        <div className="text-xs text-gray-400">{fmtDate(m.date)} {m.note ? "• " + m.note : ""}</div>
                      </div>
                    </div>
                    <span className="font-semibold" style={{ color: m.sign >= 0 ? ui : ii }}>
                      {fmt(m.sign >= 0 ? m.amount : -m.amount)}
                    </span>
                  </div>
                )} />
              <ListCard title="أحدث العروض المحفوظة" icon="file-text" items={dash.recentOffers} empty="لا توجد عروض بعد"
                render={(o) => (
                  <button key={o.id} onClick={() => setTab("savedOffers")}
                    className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2 py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold" style={{ color: tt }}>{o.meta?.offerNumber || "عرض"}</span>
                      <span className="text-gray-600">{o.customer?.name || "-"}</span>
                      <span className="text-xs text-gray-400">{o.meta?.date || fmtDate(o.savedAt)}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{fmt(o.grandTotal)}</span>
                  </button>
                )} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ListCard title="أعلى العملاء بالإنفاق" icon="users" items={dash.topCustomers} empty="لا توجد مبيعات بعد"
                render={(c) => (
                  <button key={c.name} onClick={() => setTab("customers")}
                    className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2 py-2">
                    <span className="text-gray-700 font-semibold">{c.name}</span>
                    <span className="font-semibold" style={{ color: tt }}>{fmt(c.value)}</span>
                  </button>
                )} />
              <ListCard title="الأصناف الأكثر مبيعًا" icon="boxes" items={dash.topItems} empty="لا توجد مبيعات بعد"
                render={(i) => (
                  <button key={i.name + i.qty} onClick={() => setTab("inventory")}
                    className="w-full flex items-center justify-between text-sm hover:bg-gray-50 rounded-lg px-2 py-2">
                    <span className="text-gray-700 font-semibold">{i.name}</span>
                    <span className="font-semibold" style={{ color: an }}>كمية: {i.qty}</span>
                  </button>
                )} />
            </div>
          </div>
        )}

        {tab === "sales" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                المبيعات
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {searchBox(q.sales, (v) => setQ({ ...q, sales: v }), "ابحث برقم الفاتورة أو اسم العميل...")}
                {addBtn("فاتورة بيع", () => setModal({ type: "invoice-form", kind: "sale" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dateInp(f.salesFrom, (v) => setF({ ...f, salesFrom: v }), "من تاريخ")}
              {dateInp(f.salesTo, (v) => setF({ ...f, salesTo: v }), "إلى تاريخ")}
              {selInp(f.salesRegion, (v) => setF({ ...f, salesRegion: v }), distinct(db.sales.map((s) => s.customerRegion)))}
              {statusSel(f.salesStatus, (v) => setF({ ...f, salesStatus: v }))}
              {clearBtn(() => setF((p) => ({ ...p, salesFrom: "", salesTo: "", salesRegion: "", salesStatus: "" })))}
              {fltSales.length > 0 && (
                <span className="text-xs font-semibold text-gray-500">
                  نتيجة: {fltSales.length} فاتورة
                </span>
              )}
            </div>
            {invoiceRows("sale", fltSales)}
          </div>
        )}

        {tab === "purchases" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                المشتريات
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {searchBox(q.purchases, (v) => setQ({ ...q, purchases: v }), "ابحث برقم الفاتورة أو اسم المورد...")}
                {addBtn("فاتورة شراء", () => setModal({ type: "invoice-form", kind: "purchase" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dateInp(f.purchasesFrom, (v) => setF({ ...f, purchasesFrom: v }), "من تاريخ")}
              {dateInp(f.purchasesTo, (v) => setF({ ...f, purchasesTo: v }), "إلى تاريخ")}
              {statusSel(f.purchasesStatus, (v) => setF({ ...f, purchasesStatus: v }))}
              {clearBtn(() => setF((p) => ({ ...p, purchasesFrom: "", purchasesTo: "", purchasesStatus: "" })))}
              {fltPurchases.length > 0 && (
                <span className="text-xs font-semibold text-gray-500">نتيجة: {fltPurchases.length} فاتورة</span>
              )}
            </div>
            {invoiceRows("purchase", fltPurchases)}
          </div>
        )}

        {tab === "inventory" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                المخزون
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {searchBox(q.items, (v) => setQ({ ...q, items: v }), "ابحث عن صنف...")}
                {addBtn("صنف جديد", () => setModal({ type: "product-form" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selInp(f.itemsCat, (v) => setF({ ...f, itemsCat: v }), distinct(db.items.map((i) => i.category)).filter((c) => c !== "غير محدد"))}
              {clearBtn(() => setF((p) => ({ ...p, itemsCat: "" })))}
              {fltItems.length > 0 && <span className="text-xs font-semibold text-gray-500">نتيجة: {fltItems.length} صنف</span>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                {tblHead(["الصنف", "التصنيف", "الوحدة", "الكمية", "سعر التكلفة", "سعر البيع", "الحالة", ""])}
                <tbody>
                  {fltItems.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState icon="boxes" title="لا توجد أصناف بعد" hint="أضف أول صنف لبدء إدارة المخزون." />
                      </td>
                    </tr>
                  ) : (
                    fltItems.map((i) => {
                      const low = (Number(i.qty) || 0) <= (Number(i.reorderLevel) || 0) && (Number(i.reorderLevel) || 0) > 0;
                      return (
                        <tr key={i.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-800">{i.name}</div>
                          </td>
                          <td className="px-3 py-3 text-gray-500">{i.category || "—"}</td>
                          <td className="px-3 py-3 text-gray-500">{i.unit || "قطعة"}</td>
                          <td className="px-3 py-3">
                            <span className="font-bold text-gray-800">{i.qty ?? 0}</span>
                          </td>
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmt(i.costPrice || 0)}</td>
                          <td className="px-3 py-3 text-gray-800 whitespace-nowrap">{fmt(i.salePrice || 0)}</td>
                          <td className="px-3 py-3">{low ? <Badge tone="red">منخفض</Badge> : <Badge tone="green">متاح</Badge>}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setModal({ type: "stock-adjust", id: i.id })}
                                className="px-2 py-1.5 text-xs font-medium rounded-lg hover:bg-gray-100"
                                style={{ color: tt }}
                                title="تسوية مخزون"
                              >
                                تسوية مخزون
                              </button>
                              <button
                                onClick={() => setModal({ type: "product-form", id: i.id })}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                title="تعديل"
                              >
                                <Icon name="pencil" size={16} />
                              </button>
                              <button
                                onClick={() => delGuard("item", i.id, i.name)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="حذف"
                              >
                                <Icon name="trash2" size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "customers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                العملاء
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {searchBox(q.customers, (v) => setQ({ ...q, customers: v }), "ابحث بالاسم أو الهاتف...")}
                {addBtn("عميل جديد", () => setModal({ type: "customer-form" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selInp(f.customersRegion, (v) => setF({ ...f, customersRegion: v }), distinct(db.customers.map((c) => c.region)))}
              {clearBtn(() => setF((p) => ({ ...p, customersRegion: "" })))}
              {fltCustomers.length > 0 && <span className="text-xs font-semibold text-gray-500">نتيجة: {fltCustomers.length} عميل</span>}
            </div>
            {customersTable}
          </div>
        )}

        {tab === "suppliers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                الموردون
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {searchBox(q.suppliers, (v) => setQ({ ...q, suppliers: v }), "ابحث بالاسم أو الهاتف...")}
                {addBtn("مورد جديد", () => setModal({ type: "supplier-form" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selInp(f.suppliersRegion, (v) => setF({ ...f, suppliersRegion: v }), distinct(db.suppliers.map((s) => s.region)))}
              {clearBtn(() => setF((p) => ({ ...p, suppliersRegion: "" })))}
              {fltSuppliers.length > 0 && <span className="text-xs font-semibold text-gray-500">نتيجة: {fltSuppliers.length} مورد</span>}
            </div>
            {suppliersTable}
          </div>
        )}

        {tab === "treasury" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                الخزينة
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  {(
                    [
                      ["all", "الكل"],
                      ["in", "وارد"],
                      ["out", "منصرف"],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setTrFilter(k)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      style={trFilter === k ? { backgroundColor: "#fff", color: tt, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" } : { color: "#6b7280" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {addBtn("حركة يدوية", () => setModal({ type: "manual-move" }))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dateInp(f.movesFrom, (v) => setF({ ...f, movesFrom: v }), "من تاريخ")}
              {dateInp(f.movesTo, (v) => setF({ ...f, movesTo: v }), "إلى تاريخ")}
              {selInp(f.movesCat, (v) => setF({ ...f, movesCat: v }), distinct(db.movements.map((m) => m.category)).filter((c) => c !== "غير محدد"))}
              {clearBtn(() => setF((p) => ({ ...p, movesFrom: "", movesTo: "", movesCat: "" })))}
              {fltMoves.length > 0 && <span className="text-xs font-semibold text-gray-500">نتيجة: {fltMoves.length} حركة</span>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">الرصيد الحالي بالخزينة</span>
              <span className="text-xl font-bold" style={{ color: dash.treasury >= 0 ? tt : "#dc2626" }}>
                {fmt(dash.treasury)}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                {tblHead(["التاريخ", "النوع", "البيان", "المبلغ"])}
                <tbody>
                  {fltMoves.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <EmptyState icon="wallet" title="لا توجد حركات خزينة بعد" />
                      </td>
                    </tr>
                  ) : (
                    fltMoves.map((m) => {
                      const isIn = m.sign >= 0;
                      return (
                        <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                          <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{fmtDate(m.date)}</td>
                          <td className="px-3 py-3">
                            <Badge tone={isIn ? "green" : "red"}>{isIn ? "وارد" : "منصرف"}</Badge>
                          </td>
                          <td className="px-3 py-3 text-gray-600">
                            {m.note || m.category || "—"}
                          </td>
                          <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: isIn ? ui : ii }}>
                            {isIn ? "+" : "-"} {fmt(m.amount)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "regions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: tt }}>
                المناطق
              </h2>
              {addBtn("منطقة جديدة", () => setModal({ type: "region-form" }))}
            </div>
            {db.regions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100">
                <EmptyState icon="map-pin" title="لا توجد مناطق بعد" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {db.regions.map((r) => {
                  const custs = db.customers.filter((c) => c.region === r.name).length;
                  const salesTotal = db.sales.filter((s) => s.customerRegion === r.name).reduce((s, x) => s + (Number(x.total) || 0), 0);
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-bold" style={{ color: tt }}>
                          {r.name}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setModal({ type: "region-form", id: r.id })}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            title="تعديل"
                          >
                            <Icon name="pencil" size={15} />
                          </button>
                          <button
                            onClick={() => delGuard("region", r.id, r.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="حذف"
                          >
                            <Icon name="trash2" size={15} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm text-gray-500">
                        <div className="flex justify-between">
                          <span>عدد العملاء:</span>
                          <span className="font-medium text-gray-700">{custs}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>إجمالي المبيعات:</span>
                          <span className="font-medium text-gray-700">{fmt(salesTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-4 max-w-xl">
            <h2 className="text-lg font-bold" style={{ color: tt }}>
              بيانات الشركة
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <CompanyForm
                initial={db.company}
                onSave={async ({ data }) => {
                  const r = await api("POST", "company", data);
                  if (r.ok) showToast("تم حفظ بيانات الشركة");
                  else showToast("تعذر حفظ البيانات، حاول مرة أخرى", true);
                  await load();
                }}
              />
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-500 leading-relaxed">
              <span className="font-bold text-gray-600">تنبيه قانوني:</span> هذا النظام يصدر فواتير بشكل داخلي فقط.
              الاعتماد الرسمي كفاتورة ضريبية إلكترونية وفق قانون الإجراءات الضريبية الموحد يتطلب التسجيل والإرسال
              الفعلي عبر منظومة الفاتورة الإلكترونية التابعة لمصلحة الضرائب المصرية (eta.gov.eg)، وهو إجراء منفصل خارج
              هذا التطبيق.
            </div>
          </div>
        )}
      {tab === "quotes" && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: tt }}>
              عرض سعر جديد
            </h2>
            <QuoteEditor />
          </div>
        )}

        {tab === "savedOffers" && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: tt }}>
              العروض المحفوظة وتصدير Excel
            </h2>
            <OffersList />
          </div>
        )}

        {tab === "users" && navKeys.includes("users") && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: tt }}>
              إدارة النظام
            </h2>
            <div className="flex gap-2 mb-4">
              {([
                ["users", "المستخدمون"],
                ["roles", "الأدوار والصلاحيات"],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setAdminTab(k)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  style={
                    adminTab === k
                      ? { backgroundColor: an, color: Ib }
                      : { backgroundColor: Gb, color: tt }
                  }
                >
                  {l}
                </button>
              ))}
            </div>
            {adminTab === "users" ? <ManageUsers /> : <ManageRoles />}
          </div>
        )}
      </main>
      </div>

      {/* ---------- modals ---------- */}
      {modal && modal.type === "customer-form" && (
        <CustomerForm
          initial={db.customers.find((c) => c.id === modal.id) || null}
          regions={db.regions}
          onClose={() => setModal(null)}
          onSave={async ({ data }) => {
            const r = modal.id
              ? await api("PUT", "customers", { id: modal.id, ...data })
              : await api("POST", "customers", data);
            if (r.ok) showToast("تم حفظ بيانات العميل");
            else showToast(r.data?.error || "تعذر حفظ البيانات", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "supplier-form" && (
        <SupplierForm
          initial={db.suppliers.find((c) => c.id === modal.id) || null}
          onClose={() => setModal(null)}
          onSave={async ({ data }) => {
            const r = modal.id
              ? await api("PUT", "suppliers", { id: modal.id, ...data })
              : await api("POST", "suppliers", data);
            if (r.ok) showToast("تم حفظ بيانات المورد");
            else showToast(r.data?.error || "تعذر حفظ البيانات", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "product-form" && (
        <ProductForm
          initial={db.items.find((i) => i.id === modal.id) || null}
          onClose={() => setModal(null)}
          onSave={async ({ data }) => {
            const r = modal.id
              ? await api("PUT", "items", { id: modal.id, ...data })
              : await api("POST", "items", data);
            if (r.ok) showToast("تم حفظ الصنف");
            else showToast(r.data?.error || "تعذر حفظ البيانات", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "stock-adjust" && (
        <StockAdjustForm
          item={db.items.find((i) => i.id === modal.id)!}
          onClose={() => setModal(null)}
          onSave={async ({ delta, reason }) => {
            const r = await api("POST", "items", { action: "adjust", id: modal.id, delta, reason });
            if (r.ok) showToast("تم تحديث المخزون");
            else showToast(r.data?.error || "تعذر التحديث", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "invoice-form" && (
        <InvoiceForm
          mode={modal.kind}
          parties={modal.kind === "sale" ? db.customers : db.suppliers}
          items={db.items}
          regions={db.regions}
          initialPartyId={modal.partyId}
          onClose={() => setModal(null)}
          onSave={saveInvoice}
        />
      )}
      {modal && modal.type === "invoice-view" && (
        <InvoiceView
          kind={modal.kind}
          invoice={(() => {
            const inv = (modal.kind === "sale" ? db.sales : db.purchases).find((x) => x.id === modal.id);
            if (!inv) return null;
            const party = inv.customerId
              ? db.customers.find((c) => c.id === inv.customerId)
              : db.suppliers.find((c) => c.id === inv.supplierId);
            return {
              ...inv,
              customerTaxId: party?.taxId || "",
              supplierTaxId: party?.taxId || "",
              customerRegion: inv.customerRegion || party?.region || "",
            };
          })()}
          company={db.company}
          onClose={() => setModal(null)}
          onDelete={() => {
            const inv = (modal.kind === "sale" ? db.sales : db.purchases).find((x) => x.id === modal.id);
            if (inv) delInvoice(modal.kind, inv);
          }}
        />
      )}
      {modal && modal.type === "statement" && (
        <StatementModal
          kind={modal.kind}
          id={modal.id}
          title={(modal.kind === "customer" ? db.customers : db.suppliers).find((c) => c.id === modal.id)?.name || ""}
          onPayment={() => setModal({ type: "payment", kind: modal.kind, id: modal.id })}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal.type === "payment" && (
        <PaymentDialog
          kind={modal.kind}
          name={
            modal.kind === "customer"
              ? db.customers.find((c) => c.id === modal.id)?.name || ""
              : db.suppliers.find((c) => c.id === modal.id)?.name || ""
          }
          balance={
            modal.kind === "customer"
              ? Number(db.customers.find((c) => c.id === modal.id)?.creditBalance) || 0
              : Number(db.suppliers.find((c) => c.id === modal.id)?.payableBalance) || 0
          }
          onClose={() => setModal(null)}
          onSave={async (amount, date) => {
            const kind = modal.kind === "customer" ? "collect" : "settle";
            const r = await api("POST", "payments", { kind, partyId: modal.id, amount, date });
            if (r.ok) showToast(modal.kind === "customer" ? "تم تسجيل التحصيل" : "تم تسجيل السداد");
            else showToast(r.data?.error || "تعذر الحفظ", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "manual-move" && (
        <ManualMoveForm
          onClose={() => setModal(null)}
          onSave={async ({ dir, amount, category, note, date }) => {
            const r = await api("POST", "movements", { dir, amount, category, note, date });
            if (r.ok) showToast("تم حفظ الحركة");
            else showToast(r.data?.error || "تعذر الحفظ", true);
            setModal(null);
            await load();
          }}
        />
      )}
      {modal && modal.type === "region-form" && (
        <RegionForm
          initial={db.regions.find((r) => r.id === modal.id) || null}
          onClose={() => setModal(null)}
          onSave={async ({ data }) => {
            const r = modal.id
              ? await api("PUT", "regions", { id: modal.id, ...data })
              : await api("POST", "regions", data);
            if (r.ok) showToast("تم حفظ المنطقة");
            else showToast(r.data?.error || "تعذر الحفظ", true);
            setModal(null);
            await load();
          }}
        />
      )}

      {confirm && <ConfirmDialog message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.action(); setConfirm(null); }} />}

      {toast && (
        <div className="fixed bottom-4 inset-x-0 flex justify-center z-50 px-4">
          <div
            className="px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: toast.err ? ii : ui }}
          >
            <Icon name={toast.err ? "alert-triangle" : "check-circle2"} size={17} />
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({ title, icon, items, empty, render }: { title: string; icon: any; items: any[]; empty: string; render: (x: any, i: number) => ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: tt }}>
        <Icon name={icon} size={16} />
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-6 text-center">{empty}</div>
      ) : (
        <div className="space-y-2">{items.map(render)}</div>
      )}
    </div>
  );
}

function RolePicker({ value, onChange, roles = [] }: { value: string; onChange: (v: string) => void; roles: { key: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const label = roles.find((r) => r.key === value)?.name || "اختر الدور";
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <button
        onClick={() => setOpen(!open)}
        className={inputCls}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, color: "#000", backgroundColor: "#fff" }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 2px)", right: 0, left: 0, zIndex: 60,
            backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,.15)", overflow: "hidden",
          }}
        >
          {roles.length === 0 && (
            <div style={{ padding: "9px 12px", fontSize: 13, color: "#6b7280" }}>جاري تحميل الأدوار...</div>
          )}
          {roles.map((r) => {
            const active = r.key === value;
            return (
              <button
                key={r.key}
                onClick={() => { onChange(r.key); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "right", padding: "9px 12px",
                  fontSize: 13, fontWeight: active ? 700 : 400,
                  color: "#000", backgroundColor: active ? "#fef3c7" : "#fff",
                }}
              >
                {r.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageCheckboxes({ value, onChange, locked }: { value: string[]; onChange: (pages: string[]) => void; locked?: boolean }) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key]);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))" }}>
      {ALL_PAGES.map((p) => {
        const on = value.includes(p.key);
        return (
          <label
            key={p.key}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer select-none"
            style={{
              border: on ? `1.5px solid ${an}` : "1px solid #e5e7eb",
              backgroundColor: on ? an + "1a" : "#fff",
              color: tt,
              opacity: locked ? 0.75 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={locked}
              onChange={() => toggle(p.key)}
              className="accent-current"
              style={{ accentColor: an }}
            />
            <Icon name={p.icon} size={15} />
            <span className="font-medium">{p.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function ManageRoles() {
  const [roles, setRoles] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", key: "", pages: [] as string[] });
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPages, setEditPages] = useState<string[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/roles");
    if (!r.ok) return setErr("غير مخوّل — صلاحية المدير فقط");
    setRoles((await r.json()).roles);
  }, []);
  useEffect(() => { load(); }, [load]);
  const show = (res: Response) =>
    res.json().then((j) => {
      if (!res.ok) setErr(j.error || "تعذرت العملية");
      else if (j.message) setErr("");
      return res.ok;
    }).catch(() => false);

  const add = async () => {
    if (!form.name.trim() || !form.key.trim() || form.pages.length === 0) {
      setErr("الاسم ورمز الدور وصفحة واحدة على الأقل مطلوبة");
      return;
    }
    setBusy(true); setErr("");
    const r = await fetch("/api/roles", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (await show(r)) {
      setForm({ name: "", key: "", pages: [] });
      setErr("");
      load();
    }
  };
  const startEdit = (r: any) => {
    setEditId(r.id); setEditName(r.name); setEditPages([...r.pages]);
  };
  const saveEdit = async (r: any) => {
    if (!editName.trim() || editPages.length === 0) {
      setErr("الاسم وصفحة واحدة على الأقل مطلوبة");
      return;
    }
    setBusy(true); setErr("");
    const res = await fetch(`/api/roles?id=${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, pages: editPages }),
    });
    setBusy(false);
    if (await show(res)) { setEditId(null); setErr(""); load(); }
  };
  const remove = async (r: any) => {
    setBusy(true); setErr("");
    const res = await fetch(`/api/roles?id=${r.id}`, { method: "DELETE" });
    setBusy(false);
    if (await show(res)) { setErr(""); load(); }
  };

  return (
    <div className="space-y-4">
      {err && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: ii + "11", color: ii }}>
          {err}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm" style={{ border: `1px solid ${LE}55` }}>
        <div className="p-5 space-y-3">
          <div className="text-sm font-bold" style={{ color: tt }}>إضافة دور جديد</div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="اسم الدور (مثال: مدير مخازن)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="رمز الدور بالإنجليزية (مثال: store_manager)" dir="ltr" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          </div>
          <div className="text-xs font-bold" style={{ color: tt }}>الصفحات المسموحة لهذا الدور</div>
          <PageCheckboxes value={form.pages} onChange={(pages) => setForm({ ...form, pages })} />
          <button className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ui }} onClick={add} disabled={busy}>
            {busy ? "جاري الحفظ..." : "إضافة الدور"}
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {!roles && (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm" style={{ color: tt, border: `1px solid ${LE}55` }}>
            جاري تحميل الأدوار...
          </div>
        )}
        {roles?.map((r) => (
          <div key={r.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: `1px solid ${LE}55` }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold" style={{ color: tt }}>
                  {editId === r.id ? (
                    <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: "6px 10px" }} />
                  ) : (
                    r.name
                  )}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: Gb, color: tt }} dir="ltr">{r.key}</span>
                {r.system && (
                  <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ backgroundColor: LE + "44", color: tt }}>دور أساسي</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.key !== "admin" && (
                  <>
                    <button onClick={() => (editId === r.id ? saveEdit(r) : startEdit(r))} title={editId === r.id ? "حفظ التعديل" : "تعديل"} disabled={busy}
                      style={{ color: an }}>
                      <Icon name={editId === r.id ? "check-circle2" : "pencil"} size={17} />
                    </button>
                    {editId === r.id && (
                      <button onClick={() => setEditId(null)} title="إلغاء" style={{ color: tt }}>
                        <Icon name="x" size={17} />
                      </button>
                    )}
                    {!r.system && (
                      <button onClick={() => remove(r)} title="حذف الدور" disabled={busy} style={{ color: ii }}>
                        <Icon name="trash2" size={17} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <PageCheckboxes
              value={editId === r.id ? editPages : r.pages}
              onChange={(pages) => setEditPages(pages)}
              locked={r.key === "admin" || editId !== r.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageUsers() {
  const [users, setUsers] = useState<any[] | null>(null);
  const [roles, setRoles] = useState<{ key: string; name: string }[]>([]);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sales" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [ur, rr] = await Promise.all([fetch("/api/admin"), fetch("/api/roles")]);
    if (!ur.ok) return setErr("غير مخوّل — صلاحية المدير فقط");
    setUsers((await ur.json()).users);
    if (rr.ok) setRoles((await rr.json()).roles);
  }, []);
  useEffect(() => { load(); }, [load]);
  const roleName = (role: string) => roles.find((r) => r.key === role)?.name || role;
  const roleChip = (role: string) => (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ backgroundColor: role === "admin" ? LE : an + "22", color: role === "admin" ? tt : an, border: `1px solid ${an}` }}
    >
      {roleName(role)}
    </span>
  );
  const add = async () => {
    if (!form.name || !form.email || form.password.length < 6) { setErr("الاسم والبريد وكلمة مرور (6 أحرف على الأقل) مطلوبة"); return; }
    setBusy(true); setErr("");
    const r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error || "تعذر الإضافة");
    setForm({ name: "", email: "", password: "", role: "sales" });
    load();
  };
  const changeRole = async (id: string, role: string) => {
    const r = await fetch(`/api/admin?id=${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "تعذر التعديل"); return; }
    load();
  };
  const remove = async (id: string) => {
    const r = await fetch(`/api/admin?id=${id}`, { method: "DELETE" });
    if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "تعذر الحذف"); return; }
    load();
  };
  return (
    <div className="space-y-4">
      {err && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: ii + "11", color: ii }}>
          {err}
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm" style={{ border: `1px solid ${LE}55` }}>
        <div className="p-5 space-y-3">
          <div className="text-sm font-bold" style={{ color: tt }}>إضافة مستخدم جديد</div>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="البريد الإلكتروني" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className={inputCls} placeholder="كلمة المرور" dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <RolePicker value={form.role} onChange={(v) => setForm({ ...form, role: v })} roles={roles} />
          </div>
          <button className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: ui }} onClick={add} disabled={busy}>
            {busy ? "جاري الحفظ..." : "إضافة المستخدم"}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto" style={{ border: `1px solid ${LE}55` }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right" style={{ backgroundColor: Gb }}>
              <th className="px-4 py-3 font-bold" style={{ color: tt }}>الاسم</th>
              <th className="px-4 py-3 font-bold" style={{ color: tt }}>البريد</th>
              <th className="px-4 py-3 font-bold" style={{ color: tt }}>الدور</th>
              <th className="px-4 py-3 font-bold" style={{ color: tt }}>تغيير الدور</th>
              <th className="px-4 py-3 font-bold" style={{ color: tt }}></th>
            </tr>
          </thead>
          <tbody>
            {!users && (
              <tr><td colSpan={5} className="px-4 py-6 text-center" style={{ color: tt }}>جاري التحميل...</td></tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: LE + "44" }}>
                <td className="px-4 py-3 font-semibold" style={{ color: tt }}>{u.name}</td>
                <td className="px-4 py-3" style={{ color: tt + "bb" }} dir="ltr">{u.email}</td>
                <td className="px-4 py-3">{roleChip(u.role)}</td>
                <td className="px-4 py-3">
                  <RolePicker value={u.role} onChange={(v) => changeRole(u.id, v)} roles={roles} />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(u.id)} title="حذف المستخدم">
                    <Icon name="trash2" size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatementModal({
  kind,
  id,
  title,
  onPayment,
  onClose,
}: {
  kind: "customer" | "supplier";
  id: string;
  title: string;
  onPayment: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<{ date: string; desc: string; debit: number; credit: number }[] | null>(null);
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    (async () => {
      const r = await api("GET", "statement", undefined, { id, kind });
      setRows(r.data?.rows ?? []);
      setBalance(Number(r.data?.balance) || 0);
    })();
  }, [id, kind]);
  return (
    <StatementView
      kind={kind}
      title={title}
      balanceLabel={kind === "customer" ? "الرصيد الحالي (آجل مستحق منه)" : "الرصيد الحالي (مستحق له)"}
      balance={balance}
      rows={rows ?? []}
      onPayment={onPayment}
      onClose={onClose}
    />
  );
}