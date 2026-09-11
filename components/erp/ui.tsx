"use client";

// Design tokens + UI atoms ported verbatim from the original ERP app.

import { useEffect, useRef, useState } from "react";

export const tt = "#0F2647"; // navy (headings, primary)
export const Ib = "#081426"; // dark navy (logo fill)
export const an = "#C9A227"; // gold (accent)
export const LE = "#E8C766"; // gold light
export const Gb = "#F7F4EC"; // cream background
export const ui = "#0F7A4A"; // green
export const ii = "#B42318"; // red

export const fmt = (n: any) =>
  `${(Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`;

export const fmtDate = (y?: string) => {
  if (!y) return "-";
  const d = new Date(y);
  return isNaN(d.getTime()) ? y : d.toLocaleDateString("en-GB");
};

export const today = () => new Date().toISOString().slice(0, 10);

export async function api<T = any>(
  method: string,
  resource: string,
  body?: any,
  query?: Record<string, string>
): Promise<{ ok: boolean; status: number; data: T }> {
  let url = "/api/erp/" + resource;
  if (query) url += "?" + new URLSearchParams(query).toString();
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {}
  return { ok: res.ok, status: res.status, data };
}

export function Icon({
  name,
  size = 18,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const _: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
  };
  switch (name) {
    case "plus":
      return (
        <svg {..._}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    case "x":
      return (
        <svg {..._}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case "search":
      return (
        <svg {..._}>
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "trash2":
      return (
        <svg {..._}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case "pencil":
      return (
        <svg {..._}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "alert-triangle":
      return (
        <svg {..._}>
          <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "check-circle2":
      return (
        <svg {..._}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "banknote":
      return (
        <svg {..._}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 12h.01" />
          <path d="M18 12h.01" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {..._}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case "file-text":
      return (
        <svg {..._}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      );
    case "eye":
      return (
        <svg {..._}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "arrow-up-circle":
      return (
        <svg {..._}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="16 12 12 8 8 12" />
          <line x1="12" y1="16" x2="12" y2="8" />
        </svg>
      );
    case "arrow-down-circle":
      return (
        <svg {..._}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 12 16 16 12" />
          <line x1="12" y1="8" x2="12" y2="16" />
        </svg>
      );
    case "clipboard-list":
      return (
        <svg {..._}>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="14" y2="15" />
        </svg>
      );
    case "layout-dashboard":
      return (
        <svg {..._}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "shopping-cart":
      return (
        <svg {..._}>
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.6a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
      );
    case "package-plus":
      return (
        <svg {..._}>
          <path d="M3 8l8-5 8 5-8 5-8-5Z" />
          <path d="M3 8v8l8 5 8-5V8" />
          <line x1="11" y1="13" x2="11" y2="21" />
          <line x1="19" y1="2" x2="19" y2="8" />
          <line x1="16" y1="5" x2="22" y2="5" />
        </svg>
      );
    case "boxes":
      return (
        <svg {..._}>
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      );
    case "users":
      return (
        <svg {..._}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "building2":
      return (
        <svg {..._}>
          <rect x="4" y="2" width="16" height="20" rx="1" />
          <line x1="9" y1="6" x2="9" y2="6.01" />
          <line x1="15" y1="6" x2="15" y2="6.01" />
          <line x1="9" y1="10" x2="9" y2="10.01" />
          <line x1="15" y1="10" x2="15" y2="10.01" />
          <line x1="9" y1="14" x2="9" y2="14.01" />
          <line x1="15" y1="14" x2="15" y2="14.01" />
          <line x1="9" y1="18" x2="15" y2="18" />
        </svg>
      );
    case "wallet":
      return (
        <svg {..._}>
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <circle cx="17" cy="15" r="1.3" />
        </svg>
      );
    case "map-pin":
      return (
        <svg {..._}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "printer":
      return (
        <svg {..._}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case "settings":
      return (
        <svg {..._}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    default:
      return null;
  }
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0"
    >
      <circle cx="50" cy="50" r="47" fill={Ib} stroke={an} strokeWidth="3" />
      <path
        d="M25 45 L25 62 L75 62 L75 45"
        fill="none"
        stroke={an}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M25 45 L25 30 L38 45 L50 22 L62 45 L75 30 L75 45 Z"
        fill="none"
        stroke={an}
        strokeWidth="5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// region chart bars
export function RegionBars({
  data,
  color,
}: {
  data: { name: string; value: number }[];
  color: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="w-20 text-xs text-gray-500 truncate shrink-0">
            {d.name}
          </div>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
          <div className="w-24 text-xs text-gray-600 text-left shrink-0">
            {fmt(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tone = "navy",
  sub,
}: {
  icon: string;
  label: string;
  value: any;
  tone?: "navy" | "red" | "green" | "gold";
  sub?: string;
}) {
  const W = tone === "gold" ? an : tone === "red" ? ii : tone === "green" ? ui : tt;
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${W}1A` }}
      >
        <Icon name={icon} size={20} style={{ color: W }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-800 truncate">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: string }) {
  const q: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    gold: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${q[tone] || q.gray}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${tt}10` }}
      >
        <Icon name={icon} size={26} style={{ color: tt }} />
      </div>
      <div className="font-semibold text-gray-700">{title}</div>
      {hint && <div className="text-sm text-gray-400 mt-1 max-w-xs">{hint}</div>}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 overflow-y-auto"
      style={{ backgroundColor: "rgba(8,20,38,0.55)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} my-8 py-5`}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px",  borderBottom: "1px solid #f3f4f6" }}>
          <h3
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: tt,
              pointerEvents: "none",
            }}
          >
            {title}
          </h3>
          <span style={{ width: 24 }} />
          <button
            onClick={onClose}
            style={{ color: "#9ca3af", padding: 4, borderRadius: 8 }}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        
        <div className="p-7 text-align-center py-6">
          <div style={{ width: "85%", marginInline: "auto", }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ backgroundColor: "rgba(8,20,38,0.55)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-start gap-3 mb-4">
          <Icon name="alert-triangle" className="text-amber-500 shrink-0 mt-0.5" size={22} />
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: ii }}
          >
            تأكيد الحذف
          </button>
        </div>
      </div>
    </div>
  );
}

// shared form styles from the original
export const labelCls = "block text-xs font-medium text-gray-500 mb-1";
export function numClean(v: string): string {
  return (v || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[،٫]/g, ".")
    .replace(/[^0-9.\-]/g, "");
}

export const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent";

// Native <select> popups can't be styled reliably (OS dark mode renders the option
// list as dark-on-dark), so every dropdown in the app goes through this custom one.
export function DropSelect({
  value,
  onChange,
  options,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = options.find((o) => o.value === value);
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={inputCls}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, textAlign: "right",
          color: "#000", backgroundColor: "#fff",
          padding: compact ? "7px 10px" : undefined, fontSize: compact ? 13 : undefined,
        }}
      >
        <span className="truncate">{cur ? cur.label : "اختر..."}</span>
        <span style={{ fontSize: 10, opacity: 0.6, flexShrink: 0 }}>▼</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 2px)", right: 0, left: 0, zIndex: 60,
            backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,.15)", overflow: "hidden",
            maxHeight: 260, overflowY: "auto",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value + o.label}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "right", padding: "9px 12px",
                fontSize: compact ? 13 : 14, fontWeight: o.value === value ? 700 : 400,
                color: "#000", backgroundColor: o.value === value ? "#fef3c7" : "#fff",
              }}
            >
              <span className="block truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}