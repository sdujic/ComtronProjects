// Preprosti obrisni ikonski set (stroke=currentColor), v istem slogu kot
// ostali TRONxERP izdelki (glej Landing-TRONxERP/style.css, .icon).
type IkonaProps = { className?: string };

const osnovniAtributi = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IkonaKoledar({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function IkonaStoritve({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <path d="M14.7 6.3a4 4 0 0 1-5.6 5.6L4 17v3h3l5.1-5.1a4 4 0 0 1 5.6-5.6l-2.1 2.1-2-2 2.1-2.1Z" />
    </svg>
  );
}

export function IkonaZaposleni({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 8.2a3 3 0 1 1 3.2 5.4M18.5 20a5 5 0 0 0-3.4-5.7" />
    </svg>
  );
}

export function IkonaStranke({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IkonaLokacije({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </svg>
  );
}

export function IkonaUporabnik({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function IkonaUrnik({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function IkonaZgodovina({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="11" cy="12" r="8" />
      <path d="M11 8v4l3 2" />
      <path d="M3.5 8A8 8 0 0 1 11 4" />
      <path d="M3 5v3.5h3.5" />
    </svg>
  );
}

export function IkonaZvonec({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function IkonaNastavitve({ className }: IkonaProps) {
  return (
    <svg {...osnovniAtributi} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.65 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.65a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.35 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}
