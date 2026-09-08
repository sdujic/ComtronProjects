import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Brez tega Next.js ta GET (brez dinamičnih vhodov) statično predpomni ob
// buildu - spremembe lokacij (npr. koordinate) prek admina se nikoli ne bi
// pokazale na javnem obrazcu do naslednjega redeploya.
export const dynamic = "force-dynamic";

export async function GET() {
  const lokacije = await prisma.lokacija.findMany({ where: { aktivna: true } });
  return NextResponse.json(lokacije);
}
