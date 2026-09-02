import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const lokacije = await prisma.lokacija.findMany({ where: { aktivna: true } });
  return NextResponse.json(lokacije);
}
