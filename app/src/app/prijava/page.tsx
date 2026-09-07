import { pridobiNastavitve } from "@/lib/nastavitve";
import { prijavaAdmin } from "@/lib/admin-auth-actions";
import { TronXerpLogotip } from "@/components/TronXerpLogotip";

export default async function PrijavaStran({
  searchParams,
}: {
  searchParams: { napaka?: string };
}) {
  const nastavitve = await pridobiNastavitve();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">{nastavitve.imeAplikacije}</h1>
        <p className="text-sm text-slate-500">Prijava v administracijo</p>
      </div>

      <form action={prijavaAdmin} className="card space-y-3">
        <div>
          <label className="label">E-pošta</label>
          <input type="email" name="email" required autoFocus className="input" defaultValue="admin@admin.si" />
        </div>
        <div>
          <label className="label">Geslo</label>
          <input type="password" name="geslo" required className="input" defaultValue="123" />
        </div>
        {searchParams.napaka && <p className="text-sm text-red-600">Napačna e-pošta ali geslo.</p>}
        <button type="submit" className="btn w-full">
          Prijava
        </button>
      </form>

      <div className="flex flex-col items-center gap-1 text-xs text-slate-400">
        <span>Povezano s</span>
        <TronXerpLogotip velikost="md" />
      </div>
    </main>
  );
}
