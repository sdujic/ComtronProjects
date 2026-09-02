// Nizkonivojski klient za TronOfficeAPI (https://xerp.comtron.si/tronofficeapi/swagger/).
// Sheme zahtev/odgovorov so zajete v ../../../TronOfficeAPI-referenca.md - tam
// so tudi odprta vprašanja (natančna oblika vrstic v importOrder, articleType
// za storitve, trajanje žetona), ki jih ta klient še ne rešuje do konca.

const BASE_URL = process.env.TRONXERP_API_BASE_URL ?? "https://xerp.comtron.si/tronofficeapi";
const USERNAME = process.env.TRONXERP_API_USERNAME;
const PASSWORD = process.env.TRONXERP_API_PASSWORD;

export function tronXerpConfigured() {
  return Boolean(USERNAME && PASSWORD);
}

interface DoLoginResponse {
  UserID: number;
  Token: string;
  UserName: string;
  FirmID: number;
  FirstName: string;
  LastName: string;
}

let shranjeniZeton: string | null = null;

async function prijava(): Promise<string> {
  const res = await fetch(`${BASE_URL}/login/doLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ UserName: USERNAME, Password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`TronOfficeAPI prijava neuspešna: HTTP ${res.status}`);
  }
  const podatki: DoLoginResponse = await res.json();
  shranjeniZeton = podatki.Token;
  return podatki.Token;
}

// Klic zahteva ponovno prijavo, če se izkaže, da je žeton potekel/neveljaven -
// natančen odziv za potekel žeton na /integration/* endpointih ni bil
// preverjen (samo za swagger.json smo videli {"ErrorCode":403,"ErrorMessage":
// "Seja vam je potekla"}) - koda spodaj enkrat poskusi ponovno prijavo na
// katerikoli ne-2xx odziv, kar je varno tudi če je vzrok drugačen.
export async function tronXerpRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  if (!tronXerpConfigured()) {
    throw new Error("TronOfficeAPI ni konfiguriran (manjkata TRONXERP_API_USERNAME/PASSWORD)");
  }

  const posljiZahtevo = async (token: string) => {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [kljuc, vrednost] of Object.entries(options.query ?? {})) {
      if (vrednost !== undefined) url.searchParams.set(kljuc, String(vrednost));
    }
    return fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  };

  let token = shranjeniZeton ?? (await prijava());
  let res = await posljiZahtevo(token);

  if (!res.ok) {
    token = await prijava();
    res = await posljiZahtevo(token);
  }

  if (!res.ok) {
    throw new Error(`TronOfficeAPI klic ${path} neuspešen: HTTP ${res.status}`);
  }

  return res.json();
}
