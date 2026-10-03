import type { TransportMode } from "@/lib/transport/routes";

// 예매 완료 티켓에 들어가는 탈것 옆모습 (160×56). 승차권 색과 함께 장식으로만 쓴다.

const ART: Record<TransportMode, React.ReactNode> = {
  // KTX: 길쭉한 고속열차, 오른쪽이 앞
  ktx: (
    <>
      <path d="M6 18h104c18 0 34 8 44 22 2 3 0 6-4 6H6Z" fill="#fff" />
      <path d="M6 34h146" stroke="#0b4ea2" strokeWidth="4" />
      <path d="M118 20c12 1 22 7 29 15h-29Z" fill="#1d2b4f" />
      <g fill="#1d2b4f">
        <rect x="14" y="23" width="14" height="7" rx="2" />
        <rect x="34" y="23" width="14" height="7" rx="2" />
        <rect x="54" y="23" width="14" height="7" rx="2" />
        <rect x="74" y="23" width="14" height="7" rx="2" />
        <rect x="94" y="23" width="14" height="7" rx="2" />
      </g>
      <g fill="#1d2b4f">
        <circle cx="26" cy="47" r="4" />
        <circle cx="40" cy="47" r="4" />
        <circle cx="112" cy="47" r="4" />
        <circle cx="126" cy="47" r="4" />
      </g>
      <path d="M0 52h160" stroke="#fff" strokeWidth="2" opacity="0.6" />
    </>
  ),
  // 고속버스
  bus: (
    <>
      <rect x="20" y="10" width="118" height="34" rx="8" fill="#fff" />
      <path d="M128 14h4a6 6 0 0 1 6 6v14h-10Z" fill="#11414d" />
      <g fill="#11414d">
        <rect x="28" y="16" width="20" height="12" rx="2" />
        <rect x="52" y="16" width="20" height="12" rx="2" />
        <rect x="76" y="16" width="20" height="12" rx="2" />
        <rect x="100" y="16" width="20" height="12" rx="2" />
      </g>
      <path d="M20 34h118" stroke="#0e6f86" strokeWidth="4" />
      <circle cx="44" cy="46" r="7" fill="#11414d" />
      <circle cx="44" cy="46" r="2.5" fill="#fff" />
      <circle cx="116" cy="46" r="7" fill="#11414d" />
      <circle cx="116" cy="46" r="2.5" fill="#fff" />
      <path d="M0 54h160" stroke="#fff" strokeWidth="2" opacity="0.6" />
    </>
  ),
  // 비행기: 오른쪽으로 오르는 여객기
  flight: (
    <>
      <path d="M14 34c0-4 4-7 9-7h96c10 0 22 3 30 7-8 4-20 7-30 7H23c-5 0-9-3-9-7Z" fill="#fff" />
      <path d="M70 31 46 8h12l34 23Z" fill="#dbe7f5" />
      <path d="M74 38 54 54h12l28-16Z" fill="#dbe7f5" />
      <path d="M18 29 8 12h10l16 15Z" fill="#dbe7f5" />
      <g fill="#12305a">
        <circle cx="96" cy="33" r="1.8" />
        <circle cx="88" cy="33" r="1.8" />
        <circle cx="80" cy="33" r="1.8" />
        <circle cx="72" cy="33" r="1.8" />
        <circle cx="64" cy="33" r="1.8" />
        <circle cx="56" cy="33" r="1.8" />
        <circle cx="48" cy="33" r="1.8" />
      </g>
      <path d="M134 30c4 1 8 2 11 4h-11Z" fill="#12305a" />
    </>
  ),
  // 지하철 (예매가 없어 티켓은 나오지 않지만 모양은 맞춰 둔다)
  subway: (
    <>
      <rect x="10" y="12" width="140" height="32" rx="6" fill="#fff" />
      <path d="M10 32h140" stroke="#0065b3" strokeWidth="4" />
      <g fill="#1d2b4f">
        <rect x="18" y="18" width="18" height="9" rx="2" />
        <rect x="44" y="18" width="18" height="9" rx="2" />
        <rect x="98" y="18" width="18" height="9" rx="2" />
        <rect x="124" y="18" width="18" height="9" rx="2" />
      </g>
      <rect x="70" y="16" width="20" height="26" rx="2" fill="#1d2b4f" />
    </>
  ),
};

export function VehicleArt({ mode, className }: { mode: TransportMode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 56" aria-hidden="true">
      {ART[mode]}
    </svg>
  );
}
