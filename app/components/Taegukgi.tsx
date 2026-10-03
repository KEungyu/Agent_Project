// 태극기 (국기의 깃면 규정 비율 3:2). 태극은 대각선을 따라 기울이고, 네 귀에 건·곤·감·리 괘를 둔다.
// 좌표계: 가운데가 (0,0), 가로 72 × 세로 48.
const TILT = (Math.atan2(2, 3) * 180) / Math.PI; // 대각선 각도 ≈ 33.69°

export function Taegukgi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-36 -24 72 48" role="img" aria-label="태극기 Flag of the Republic of Korea">
      <rect x="-36" y="-24" width="72" height="48" fill="#fff" />
      {/* 건(왼쪽 위, ☰)과 곤(오른쪽 아래, ☷) */}
      <g transform={`rotate(${-(90 - TILT)})`}>
        <g stroke="#000" strokeWidth="2">
          <path d="M-6-25H6M-6-22H6M-6-19H6" />
          <path d="M-6 19H6M-6 22H6M-6 25H6" />
        </g>
        <path d="M0 17v10" stroke="#fff" strokeWidth="1" />
        {/* 태극: 위 빨강, 아래 파랑 */}
        <circle r="12" fill="#cd2e3a" />
        <path d="M0-12A6 6 0 0 0 0 0A6 6 0 0 1 0 12A12 12 0 0 1 0-12Z" fill="#0047a0" />
      </g>
      {/* 리(왼쪽 아래, ☲)와 감(오른쪽 위, ☵) */}
      <g transform={`rotate(${-(90 + TILT)})`}>
        <g stroke="#000" strokeWidth="2">
          <path d="M-6-25H6M-6-22H6M-6-19H6" />
          <path d="M-6 19H6M-6 22H6M-6 25H6" />
        </g>
        <path d="M0-23.5v3M0 17v3.5M0 23.5v3" stroke="#fff" strokeWidth="1" />
      </g>
    </svg>
  );
}
