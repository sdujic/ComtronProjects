"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IkonaKoledar,
  IkonaStoritve,
  IkonaZaposleni,
  IkonaStranke,
  IkonaLokacije,
  IkonaUrnik,
  IkonaZgodovina,
  IkonaNastavitve,
  IkonaNavodila,
} from "@/components/icons";

const POVEZAVE = [
  { href: "/admin/koledar", naziv: "Koledar", Ikona: IkonaKoledar },
  { href: "/admin/storitve", naziv: "Storitve", Ikona: IkonaStoritve },
  { href: "/admin/zaposleni", naziv: "Zaposleni", Ikona: IkonaZaposleni },
  { href: "/admin/urniki", naziv: "Urniki", Ikona: IkonaUrnik },
  { href: "/admin/stranke", naziv: "Stranke", Ikona: IkonaStranke },
  { href: "/admin/zgodovina", naziv: "Zgodovina servisov", Ikona: IkonaZgodovina },
  { href: "/admin/lokacije", naziv: "Lokacije", Ikona: IkonaLokacije },
  { href: "/admin/nastavitve", naziv: "Nastavitve", Ikona: IkonaNastavitve },
];

export function AdminNav() {
  const pot = usePathname();

  return (
    <nav className="space-y-0.5">
      {POVEZAVE.map(({ href, naziv, Ikona }) => {
        const aktivno = pot?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              aktivno ? "bg-primary-50 text-primary-500" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Ikona className={`h-5 w-5 ${aktivno ? "text-primary-500" : "text-slate-400"}`} />
            {naziv}
          </Link>
        );
      })}
      <a
        href="/Navodila-NarocanjeNaTermin.html"
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center gap-3 rounded-lg border-t border-slate-100 px-3 pb-1 pt-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <IkonaNavodila className="h-5 w-5 text-slate-400" />
        Navodila za uporabo
      </a>
    </nav>
  );
}
