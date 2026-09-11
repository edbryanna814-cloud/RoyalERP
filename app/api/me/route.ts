import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession, bearerToken } from "@/lib/auth";
import { db } from "@/lib/mongodb";
import { resolveRole } from "@/lib/roles";

// Always read the user fresh from the DB so pre-role tokens and demotions apply immediately.
export async function GET(req: NextRequest) {
  const session = await getSession(bearerToken(req));
  if (!session) return NextResponse.json({ error: "غير مسجل" }, { status: 401 });
  const d = await db();
  const u = await d.collection("users").findOne({ _id: new ObjectId(session.id) } as any);
  if (!u) return NextResponse.json({ error: "حساب غير موجود" }, { status: 401 });
  const roleKey = u.role || "sales";
  const role = await resolveRole(roleKey);
  return NextResponse.json({
    user: {
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: roleKey,
      roleName: role.name,
      pages: role.pages,
    },
  });
}

export const dynamic = "force-dynamic";