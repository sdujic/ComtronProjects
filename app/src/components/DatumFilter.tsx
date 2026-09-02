"use client";

import { useRouter } from "next/navigation";

export function DatumFilter({ datum, pogled }: { datum: string; pogled?: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      defaultValue={datum}
      className="input"
      onChange={(e) => router.push(`/admin/koledar?pogled=${pogled ?? "dan"}&datum=${e.target.value}`)}
    />
  );
}
