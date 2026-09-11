// ponytail: self-check for the ERP invoice math (VAT, totals, remaining)
import assert from "node:assert";
import { invoiceTotals } from "../lib/erp-const.ts";

const t = invoiceTotals(
  [
    { qty: 2, price: 100 },
    { qty: 1, price: 50 },
  ],
  true,
  0
);
assert.deepStrictEqual(t, { subtotal: 250, vatAmount: 35, total: 285, paid: 0, remaining: 285 });

assert.deepStrictEqual(invoiceTotals([{ qty: 1, price: 1000 }], true, 1000), {
  subtotal: 1000,
  vatAmount: 140,
  total: 1140,
  paid: 1000,
  remaining: 140,
});

const noVat = invoiceTotals([{ qty: 1, price: 100 }], false, 40);
assert.equal(noVat.total, 100);
assert.equal(noVat.remaining, 60);

const overPay = invoiceTotals([{ qty: 1, price: 100 }], false, 9999);
assert.equal(overPay.paid, 100);
assert.equal(overPay.remaining, 0);

console.log("erp self-check OK");