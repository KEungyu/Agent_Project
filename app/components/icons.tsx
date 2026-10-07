import type { SpotCategory } from "@/lib/map/cities";

// 여행 보드에서 쓰는 선 아이콘. 20px 격자, 1.6 선 굵기로 맞춘다.

type Props = { className?: string };

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg className={className} width="1em" height="1em" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const CATEGORY_PATHS: Record<SpotCategory, React.ReactNode> = {
  // 기와지붕 건물
  sight: (
    <>
      <path d="M2.5 7.5c2.5 0 5-1.6 7.5-4 2.5 2.4 5 4 7.5 4" />
      <path d="M4.5 8.5v7.5M15.5 8.5v7.5M8 16v-4h4v4M2.5 16.5h15" />
    </>
  ),
  // 그릇과 젓가락
  food: (
    <>
      <path d="M3 10.5h14a7 7 0 0 1-14 0Z" />
      <path d="M11 7.5 16.5 2.5M8.5 7 13 2" />
    </>
  ),
  // 반짝임
  experience: (
    <>
      <path d="M10 2.5c.6 3.6 1.9 4.9 5.5 5.5-3.6.6-4.9 1.9-5.5 5.5-.6-3.6-1.9-4.9-5.5-5.5 3.6-.6 4.9-1.9 5.5-5.5Z" />
      <path d="M15.5 13.5v4M13.5 15.5h4" />
    </>
  ),
  // 쇼핑백
  shopping: (
    <>
      <path d="M4 6.5h12l-1 11H5Z" />
      <path d="M7.5 8.5V5.5a2.5 2.5 0 0 1 5 0v3" />
    </>
  ),
  // 초승달과 별
  night: (
    <>
      <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" />
      <path d="M14.5 3v3M13 4.5h3" />
    </>
  ),
};

export function CategoryIcon({ category, className }: Props & { category: SpotCategory }) {
  return <Svg className={className}>{CATEGORY_PATHS[category]}</Svg>;
}

export function PlaneIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M2.5 11.5 17 6.5c.9-.3 1.4.9.6 1.4L7 13.5l-2.5-.5Z" />
      <path d="m7.5 9.8-2.5-4 2-.6 4.6 3M9 12.8l1.5 3.7 1.8-.7-.6-4.6" />
    </Svg>
  );
}

export function MoonIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8Z" />
    </Svg>
  );
}

export function BedIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M2.5 5v11M2.5 13h15v3M17.5 13v-2.5a2.5 2.5 0 0 0-2.5-2.5H9v5" />
      <circle cx="5.8" cy="9.8" r="1.6" />
    </Svg>
  );
}

export function ChevronIcon({ className, direction }: Props & { direction: "left" | "right" }) {
  return <Svg className={className}>{direction === "left" ? <path d="m12 4.5-5.5 5.5 5.5 5.5" /> : <path d="m8 4.5 5.5 5.5L8 15.5" />}</Svg>;
}

export function ExternalIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M11.5 3.5h5v5M16.5 3.5 9 11M14.5 11.5v4a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h4" />
    </Svg>
  );
}

export function TrainIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5 13.5V6a3.5 3.5 0 0 1 3.5-3.5h3A3.5 3.5 0 0 1 15 6v7.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M5 9.5h10M7.5 12.5h.01M12.5 12.5h.01M7 15.5 5.5 18M13 15.5l1.5 2.5" />
    </Svg>
  );
}

export function BusIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="3" width="13" height="12.5" rx="2" />
      <path d="M3.5 10h13M6.5 13h.01M13.5 13h.01M6 15.5V17.5M14 15.5V17.5M3.5 6.5h13" />
    </Svg>
  );
}

export function SubwayIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="4.5" y="2.5" width="11" height="12.5" rx="3" />
      <path d="M4.5 9h11M8 12.5h.01M12 12.5h.01M7.5 15l-2 3M12.5 15l2 3M8.5 5.5h3" />
    </Svg>
  );
}

export function CheckIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Svg>
  );
}

export function XIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </Svg>
  );
}

export function TerminalIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M2.5 16.5h15M4 16.5V9l6-4 6 4v7.5M8 16.5v-4h4v4M7 9.5h6" />
    </Svg>
  );
}

export function SimIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6 2.5h6l3.5 3.5v10.5a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <rect x="7.5" y="9" width="6" height="6" rx="1" />
      <path d="M10.5 9v6M7.5 12h6" />
    </Svg>
  );
}

export function CardIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="M2.5 8.5h15M5.5 12.5h4" />
    </Svg>
  );
}

export function ClockIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" />
    </Svg>
  );
}

export function ReceiptIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M4.5 2.5h11v15l-2-1.3-1.8 1.3-1.7-1.3-1.7 1.3-1.8-1.3-2 1.3Z" />
      <path d="M7.5 6.5h5M7.5 9.5h5M7.5 12.5h3" />
    </Svg>
  );
}

export function CoinsIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <ellipse cx="8" cy="6" rx="5" ry="2.5" />
      <path d="M3 6v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V6" />
      <path d="M8 12.5v2c0 1.4 2.2 2.5 5 2.5s4.5-1 4.5-2.5v-4c0-1.2-1.5-2.1-3.5-2.4" />
    </Svg>
  );
}

export function SuitcaseIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="3" y="6" width="14" height="10.5" rx="2" />
      <path d="M7.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6M7 6v10.5M13 6v10.5" />
    </Svg>
  );
}

export function EnvelopeIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 5.5 7 5.5 7-5.5" />
    </Svg>
  );
}

export function TaxiIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M7.5 4.5h5l.8 2.5M3.5 13.5V10l1.8-3h9.4l1.8 3v3.5a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1Z" />
      <path d="M3.5 10.5h13M6 12.5h.01M14 12.5h.01M5 14.5v1.5M15 14.5v1.5" />
    </Svg>
  );
}

export function HotelIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 17.5v-13a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v13M12.5 8.5h3a1 1 0 0 1 1 1v8M2 17.5h16" />
      <path d="M6.5 6.5h1M9.5 6.5h1M6.5 9.5h1M9.5 9.5h1M6.5 12.5h1M9.5 12.5h1M14.5 11.5h.01M14.5 14.5h.01M7.5 17.5v-2.5h2v2.5" />
    </Svg>
  );
}

export function PhoneIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5 3h3l1.5 4-2 1.2a9 9 0 0 0 4.3 4.3l1.2-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A14 14 0 0 1 3.5 4.6 1.5 1.5 0 0 1 5 3Z" />
    </Svg>
  );
}

export function PinIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5Z" />
      <circle cx="10" cy="8" r="2" />
    </Svg>
  );
}

export function CopyIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="6.5" y="6.5" width="10" height="11" rx="2" />
      <path d="M13.5 6.5V4.5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2" />
    </Svg>
  );
}

export function LinkIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
    </Svg>
  );
}

export function ShowIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="5" y="2.5" width="10" height="15" rx="2" />
      <path d="M8 6h4M8 9h4M8 12h2" />
    </Svg>
  );
}

export function FoodIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6 2.5v6a2 2 0 0 0 4 0v-6M8 2.5v15M14 17.5v-15c-2 1-3 3-3 6v3h3" />
    </Svg>
  );
}

export function SwapIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M6.5 3.5v13M3.5 6.5l3-3 3 3M13.5 16.5v-13M10.5 13.5l3 3 3-3" />
    </Svg>
  );
}

export function LocateIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="10" r="5.5" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
      <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
    </Svg>
  );
}

export function PillIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <rect x="2.8" y="7" width="14.4" height="6" rx="3" transform="rotate(-40 10 10)" />
      <path d="m8.1 7.7 3.8 4.6" />
    </Svg>
  );
}

export function BagIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M4.5 7h11l-.8 9.5a1 1 0 0 1-1 .9H6.3a1 1 0 0 1-1-.9Z" />
      <path d="M7.5 9V6a2.5 2.5 0 0 1 5 0v3" />
    </Svg>
  );
}

export function PenIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M13.5 3.5 16.5 6.5 7 16H4v-3Z" />
      <path d="m11.5 5.5 3 3" />
    </Svg>
  );
}

export function SpeakerIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5Z" />
      <path className="wave-1" d="M13 7.5a3.5 3.5 0 0 1 0 5" />
      <path className="wave-2" d="M15 5.5a6.5 6.5 0 0 1 0 9" />
    </Svg>
  );
}

export function ChatIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M3.5 5.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-3.5 3v-3h0a2 2 0 0 1-2-2Z" />
      <path d="M7 8h6M7 10.5h4" />
    </Svg>
  );
}

export function SirenIcon({ className }: Props) {
  return (
    <Svg className={className}>
      <path d="M5.5 15v-4a4.5 4.5 0 0 1 9 0v4" />
      <path d="M3.5 15h13v2h-13ZM10 2.5v2M3.8 5l1.4 1.4M16.2 5l-1.4 1.4" />
    </Svg>
  );
}
