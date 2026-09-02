"use client";

import { useTransition } from "react";
import { spremeniStatusTermina } from "@/lib/actions";

const STATUSI = ["V_POTRJEVANJU", "REZERVIRAN", "NEPRIHOD", "ODPOVEDAN", "ZAKLJUCEN"];
const STATUS_OZNAKE: Record<string, string> = {
  V_POTRJEVANJU: "V potrjevanju",
  REZERVIRAN: "Potrjen",
  NEPRIHOD: "Neprihod",
  ODPOVEDAN: "Zavrnjen/odpovedan",
  ZAKLJUCEN: "Zaključen",
};

export function StatusSelect({ terminId, status }: { terminId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      className="input"
      onChange={(e) => startTransition(() => spremeniStatusTermina(terminId, e.target.value))}
    >
      {STATUSI.map((s) => (
        <option key={s} value={s}>
          {STATUS_OZNAKE[s]}
        </option>
      ))}
    </select>
  );
}
