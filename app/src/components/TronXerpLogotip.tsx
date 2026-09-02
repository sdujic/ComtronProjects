// TRONxERP/Comtron wordmark - ista obravnava (barve, "x" v accent barvi,
// "by Comtron" podnapis) kot na Landing-TRONxERP strani, glej
// globals.css .tronxerp-logotip. Ta aplikacija je samostojen izdelek
// (glej Nastavitve.imeAplikacije), ta logotip označuje povezavo/poreklo -
// "Povezano s TRONxERP".
export function TronXerpLogotip({ velikost = "sm" }: { velikost?: "sm" | "md" }) {
  const tekstVelikost = velikost === "md" ? "text-xl" : "text-sm";
  return (
    <span className={`tronxerp-logotip ${tekstVelikost}`}>
      <span>
        TRON<span className="x">x</span>ERP
        <small>by Comtron</small>
      </span>
    </span>
  );
}
