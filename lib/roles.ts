import { db } from "./mongodb";
import { DEFAULT_ROLE_PAGES, PAGE_KEYS } from "./pages";

type RoleDoc = {
  _id?: any;
  key: string;
  name: string;
  pages: string[];
  system: boolean;
  createdAt?: Date;
};

// Roles are global (not per-user), so a tiny keyed TTL cache keeps gating cheap
// while still picking up admin edits within ~5s.
const cache = new Map<string, { at: number; name: string; pages: string[] }>();
const TTL = 5_000;

export function validPages(pages: unknown): string[] {
  if (!Array.isArray(pages)) return [];
  return PAGE_KEYS.filter((k) => pages.includes(k));
}

export async function seedRolesIfNeeded() {
  const d = await db();
  const col = d.collection<RoleDoc>("roles");
  const count = await col.countDocuments();
  if (count > 0) return;
  await col.insertMany([
    { key: "admin", name: "مدير عام", pages: [...DEFAULT_ROLE_PAGES.admin], system: true, createdAt: new Date() },
    { key: "sales", name: "مدير مبيعات", pages: [...DEFAULT_ROLE_PAGES.sales], system: true, createdAt: new Date() },
    { key: "purchase", name: "مدير مشتريات", pages: [...DEFAULT_ROLE_PAGES.purchase], system: true, createdAt: new Date() },
  ]);
}

export async function resolveRole(roleKey?: string) {
  const key = roleKey || "sales";
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { key, name: hit.name, pages: hit.pages };
  let doc: RoleDoc | null = null;
  try {
    const d = await db();
    doc = (await d.collection<RoleDoc>("roles").findOne({ key })) as RoleDoc | null;
  } catch {
    // DB hiccup: fall back to built-in defaults rather than blocking the app.
  }
  const pages =
    doc && doc.pages && doc.pages.length ? validPages(doc.pages) : DEFAULT_ROLE_PAGES[key] || [];
  const name = doc?.name || key;
  cache.set(key, { at: Date.now(), name, pages });
  return { key, name, pages };
}

export async function canAccess(roleKey: string, page: string) {
  const r = await resolveRole(roleKey);
  return r.pages.includes(page);
}

export function invalidateRole(key: string) {
  cache.delete(key);
}

export async function listRoles() {
  await seedRolesIfNeeded();
  const d = await db();
  const rows = (await d
    .collection<RoleDoc>("roles")
    .find({})
    .sort({ system: -1, key: 1 })
    .toArray()) as RoleDoc[];
  return rows.map((r) => ({
    id: String(r._id),
    key: r.key,
    name: r.name,
    pages: validPages(r.pages),
    system: !!r.system,
  }));
}