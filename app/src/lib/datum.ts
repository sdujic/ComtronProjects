// Pretvorba Date -> "YYYY-MM-DD" po LOKALNEM času, ne po UTC. `toISOString()`
// pretvarja v UTC, kar pri časovnih pasovih pred UTC (npr. Europe/Ljubljana,
// UTC+1/+2) povzroči, da polnoč lokalnega dne "pade" na prejšnji dan v UTC -
// npr. 1.9. ob 00:00 CEST postane "2026-08-31" namesto "2026-09-01". Ta
// funkcija je varna za rabo na strežniku in na klientu.
export function lokalniDatumString(d: Date): string {
  const leto = d.getFullYear();
  const mesec = String(d.getMonth() + 1).padStart(2, "0");
  const dan = String(d.getDate()).padStart(2, "0");
  return `${leto}-${mesec}-${dan}`;
}
