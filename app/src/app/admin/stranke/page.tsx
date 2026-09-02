import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function StrankeStran() {
  const stranke = await prisma.stranka.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { termini: true } } },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">Stranke</h1>
      <div className="space-y-2">
        {stranke.map((s) => (
          <Link key={s.id} href={`/admin/stranke/${s.id}`} className="card block hover:border-primary-400">
            <div className="font-medium">
              {s.ime} {s.priimek}
            </div>
            <div className="text-sm text-slate-500">
              {s.telefon} {s.email && `· ${s.email}`} · {s._count.termini} terminov
            </div>
          </Link>
        ))}
        {stranke.length === 0 && <p className="text-slate-500">Ni strank.</p>}
      </div>
    </div>
  );
}
