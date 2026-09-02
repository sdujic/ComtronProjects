"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export type LokacijaNaZemljevidu = {
  id: string;
  naziv: string;
  naslov?: string | null;
  lat?: number | null;
  lng?: number | null;
};

// Zemljevid izbire poslovalnice - naročnikova zahteva (2.9.2026): gumb
// "Pokaži v zemljevidih" pri izbiri poslovalnice odpre okno z označenimi
// vsemi poslovalnicami, klik na oznako izbere lokacijo. Uporablja Leaflet +
// OpenStreetMap (brezplačno, brez API ključa) namesto Google Maps JS API -
// naročnikova izrecna odločitev, da se izogne Google Cloud računu/plačilni
// kartici (glej README, razdelek o Google Maps).
export function ZemljevidLokacij({
  lokacije,
  onIzberi,
  onZapri,
}: {
  lokacije: LokacijaNaZemljevidu[];
  onIzberi: (lokacija: LokacijaNaZemljevidu) => void;
  onZapri: () => void;
}) {
  const vsebnikRef = useRef<HTMLDivElement | null>(null);
  const zemljevidRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let odstranjeno = false;

    import("leaflet").then((L) => {
      if (odstranjeno || !vsebnikRef.current || zemljevidRef.current) return;

      // Privzete Leaflet ikone kažejo na relativne poti, ki jih bundler ne
      // razreši pravilno - standarden popravek za rabo z bundlerji (Webpack/
      // Next.js), ikone se naložijo s CDN-ja namesto lokalno.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const zKoordinato = lokacije.filter(
        (l): l is LokacijaNaZemljevidu & { lat: number; lng: number } => l.lat != null && l.lng != null
      );
      const sredinaSlovenije: [number, number] = [46.1512, 14.9955];
      const sredina: [number, number] =
        zKoordinato.length > 0
          ? [
              zKoordinato.reduce((s, l) => s + l.lat, 0) / zKoordinato.length,
              zKoordinato.reduce((s, l) => s + l.lng, 0) / zKoordinato.length,
            ]
          : sredinaSlovenije;

      const zemljevid = L.map(vsebnikRef.current).setView(sredina, zKoordinato.length > 1 ? 8 : 13);
      zemljevidRef.current = zemljevid;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(zemljevid);

      zKoordinato.forEach((l) => {
        const marker = L.marker([l.lat, l.lng]).addTo(zemljevid);

        const vsebina = document.createElement("div");
        const naslovEl = document.createElement("strong");
        naslovEl.textContent = l.naziv;
        vsebina.appendChild(naslovEl);
        if (l.naslov) {
          vsebina.appendChild(document.createElement("br"));
          const naslovBesedilo = document.createElement("span");
          naslovBesedilo.className = "text-xs text-slate-500";
          naslovBesedilo.textContent = l.naslov;
          vsebina.appendChild(naslovBesedilo);
        }
        vsebina.appendChild(document.createElement("br"));
        const gumb = document.createElement("button");
        gumb.textContent = "Izberi to poslovalnico";
        gumb.className = "btn mt-2 text-xs";
        gumb.style.padding = "4px 10px";
        gumb.onclick = () => onIzberi(l);
        vsebina.appendChild(gumb);

        marker.bindPopup(vsebina);
      });

      if (zKoordinato.length > 1) {
        const meje = L.latLngBounds(zKoordinato.map((l) => [l.lat, l.lng] as [number, number]));
        zemljevid.fitBounds(meje, { padding: [30, 30] });
      }
    });

    return () => {
      odstranjeno = true;
      zemljevidRef.current?.remove();
      zemljevidRef.current = null;
    };
  }, [lokacije, onIzberi]);

  const stKoordinat = lokacije.filter((l) => l.lat != null && l.lng != null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onZapri}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">Izberite poslovalnico na zemljevidu</h2>
          <button onClick={onZapri} className="text-sm text-slate-400 hover:text-slate-600">
            Zapri ✕
          </button>
        </div>
        <div ref={vsebnikRef} style={{ height: "420px" }} className="overflow-hidden rounded-lg" />
        {stKoordinat === 0 && (
          <p className="mt-2 text-xs text-amber-600">
            Za nobeno poslovalnico ni nastavljenih koordinat - dodaj jih na /admin/lokacije.
          </p>
        )}
      </div>
    </div>
  );
}
