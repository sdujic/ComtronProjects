import { NextRequest, NextResponse } from "next/server";
import { IME_PISKOTKA, preveriSejniPiskotek } from "@/lib/admin-seja";

// Ščiti /admin/* - preverjanje piškotka je brezstanjsko/podpisano (Web
// Crypto), NE poizvedba v bazo, ker middleware v Next.js teče v Edge
// runtimu, kjer Prisma (SQLite) ne deluje. Glej src/lib/admin-seja.ts.
export async function middleware(req: NextRequest) {
  const piskotek = req.cookies.get(IME_PISKOTKA)?.value;
  const email = await preveriSejniPiskotek(piskotek);

  if (!email) {
    const url = req.nextUrl.clone();
    url.pathname = "/prijava";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
