export function odsteviMinut(cas: string, minut: number): string {
  const [h, m] = cas.split(":").map(Number);
  const skupajMin = Math.max(0, h * 60 + m - minut);
  return `${String(Math.floor(skupajMin / 60)).padStart(2, "0")}:${String(skupajMin % 60).padStart(2, "0")}`;
}
