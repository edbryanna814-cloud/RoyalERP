// ponytail: self-check for the money/export arithmetic (the only non-trivial math)
import assert from "node:assert";

const rowTotal = (r) => (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
const grand = (rows) => rows.reduce((s, r) => s + rowTotal(r), 0);

assert.equal(rowTotal({ qty: "3", price: "10.5" }), 31.5);
assert.equal(rowTotal({ qty: "", price: "5" }), 0);
assert.equal(rowTotal({ qty: "2", price: "abc" }), 0);
assert.equal(grand([{ qty: "2", price: "5" }, { qty: "1", price: "10" }]), 20);

const itemRow = (q) => ({
  "الإجمالي": (parseFloat(q.row.qty) || 0) * (parseFloat(q.row.price) || 0),
});
assert.equal(itemRow({ row: { qty: "4", price: "2.25" } })["الإجمالي"], 9);

const fmt = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
assert.equal(fmt(31.5), "31.50");
assert.equal(fmt(0), "0.00");
assert.equal(fmt(40.005), "40.01");

console.log("self-check OK");
