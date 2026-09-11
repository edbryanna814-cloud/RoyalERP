import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CORS للنسخة الموبايل والويب: العميل يتصل من منفذ/مجال تاني (Metro 8081 أو نطاقك اللي بعدين).
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin || "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: res.headers });
  return res;
}

export const config = { matcher: "/api/:path*" };