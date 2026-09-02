import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { pridobiNastavitve } from "@/lib/nastavitve";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
});

export async function generateMetadata(): Promise<Metadata> {
  const nastavitve = await pridobiNastavitve();
  return {
    title: nastavitve.imeAplikacije,
    description: "Spletno naročanje na termin",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl" className={roboto.variable}>
      <body>{children}</body>
    </html>
  );
}
