export const ALL_PAGES = [
  { key: "dashboard", label: "لوحة التحكم", icon: "layout-dashboard" },
  { key: "sales", label: "المبيعات", icon: "shopping-cart" },
  { key: "purchases", label: "المشتريات", icon: "package-plus" },
  { key: "inventory", label: "المخزون", icon: "boxes" },
  { key: "customers", label: "العملاء", icon: "users" },
  { key: "suppliers", label: "الموردون", icon: "building2" },
  { key: "treasury", label: "الخزينة", icon: "wallet" },
  { key: "regions", label: "المناطق", icon: "map-pin" },
  { key: "settings", label: "بيانات الشركة", icon: "settings" },
  { key: "quotes", label: "عرض سعر جديد", icon: "file-text" },
  { key: "savedOffers", label: "العروض المحفوظة وتصدير Excel", icon: "clipboard-list" },
  { key: "users", label: "المستخدمون", icon: "users" },
] as const;

export type PageKey = (typeof ALL_PAGES)[number]["key"];

export const PAGE_KEYS: string[] = ALL_PAGES.map((p) => p.key);

export const PAGE_LABELS: Record<string, string> = Object.fromEntries(
  ALL_PAGES.map((p) => [p.key, p.label])
) as Record<string, string>;

export const SYSTEM_ROLE_KEYS = ["admin", "sales", "purchase"];

export const DEFAULT_ROLE_PAGES: Record<string, string[]> = {
  admin: [...PAGE_KEYS],
  sales: ["dashboard", "sales", "customers", "inventory", "quotes", "savedOffers"],
  purchase: ["dashboard", "purchases", "suppliers", "inventory"],
};