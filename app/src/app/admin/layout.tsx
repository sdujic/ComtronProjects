import { AdminShell } from "@/components/AdminShell";
import { prisma } from "@/lib/prisma";
import { pridobiNastavitve } from "@/lib/nastavitve";

// Prijava/odjava: middleware.ts ščiti vse /admin poti (glej tudi
// src/lib/admin-seja.ts) - en sam admin uporabnik iz .env, enostavna
// rešitev za MVP (glej .env.example za pojasnilo omejitev). Postavitev
// (stranska navigacija, glava) je v AdminShell (client komponenta -
// potrebuje stanje za mobilni "hamburger" meni).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [lokacija, nastavitve] = await Promise.all([
    prisma.lokacija.findFirst({ where: { aktivna: true } }),
    pridobiNastavitve(),
  ]);

  return (
    <AdminShell imeAplikacije={nastavitve.imeAplikacije} lokacijaNaziv={lokacija?.naziv ?? null}>
      {children}
    </AdminShell>
  );
}
