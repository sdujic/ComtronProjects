import type { Config } from "tailwindcss";

// Barvna paleta usklajena s TRONxERP (glej Landing-TRONxERP/style.css in
// dejanski izgled aplikacije po prijavi) - primarna modra + temno moder ink
// tekst, isti odtenki kot preostali deli TRONxERP ekosistema.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e8f2fa",
          100: "#cfe4f5",
          400: "#1863dc",
          500: "#0066b3",
          600: "#004c87",
          700: "#003259",
        },
        accent: {
          500: "#e7372f",
          600: "#b82922",
        },
        ink: "#14213d",
      },
      fontFamily: {
        sans: ["var(--font-roboto)", "Segoe UI", "-apple-system", "BlinkMacSystemFont", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
