import Link from "next/link";
import { pridobiNastavitve } from "@/lib/nastavitve";
import { najdiDejavnost } from "@/lib/dejavnosti";
import { TronXerpLogotip } from "@/components/TronXerpLogotip";

export default async function Domov() {
  const nastavitve = await pridobiNastavitve();
  const dejavnost = najdiDejavnost(nastavitve.dejavnost);
  const slogan = nastavitve.slogan || dejavnost.slogan;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold">{nastavitve.imeAplikacije}</h1>
      <p className="text-slate-600">{slogan}</p>
      <Link href="/rezervacija" className="btn">
        Rezerviraj termin
      </Link>
      <Link href="/admin" className="btn-secondary">
        Admin vstop
      </Link>
      <div className="mt-6 flex flex-col items-center gap-1 text-xs text-slate-400">
        <span>Povezano s</span>
        <TronXerpLogotip velikost="md" />
      </div>
    </main>
  );
}
