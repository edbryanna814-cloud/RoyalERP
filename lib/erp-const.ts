export const UNITS = ["قطعة", "كرتونة", "كيلوجرام", "لفة", "متر", "درزينة"];
export const ITEM_CATEGORIES = ["كرتون", "بلاستيك", "ورق طباعة", "ملصقات وإتيكيت", "مستلزمات طباعة", "أخرى"];
export const REGION_DEFAULTS = ["القاهرة", "الجيزة", "الإسكندرية", "الدلتا", "القناة والسواحل", "الصعيد"];
export const EXPENSE_CATEGORIES = ["إيجار", "رواتب", "تسويق", "مرافق وفواتير", "صيانة", "مصروفات أخرى"];
export const INCOME_CATEGORIES = ["إيراد آخر", "استرداد"];

export const VAT_RATE = 0.14;

export function invoiceTotals(
  rows: { qty: number; price: number }[],
  vatEnabled: boolean,
  paid: number
) {
  const subtotal = Math.round(rows.reduce((s, r) => s + r.qty * r.price, 0) * 100) / 100;
  const vatAmount = vatEnabled ? Math.round(subtotal * VAT_RATE * 100) / 100 : 0;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  const p = Math.round(Math.min(paid, total) * 100) / 100;
  return { subtotal, vatAmount, total, paid: p, remaining: Math.round((total - p) * 100) / 100 };
}