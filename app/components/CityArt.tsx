// 도시 엽서: 도시마다 고유한 그라데이션과 상징 그림. 여행지 둘러보기 안에서만 쓰는 장식 색이며,
// 실행 단계 색(대행·준비·안내)이나 상태 표시에는 쓰지 않는다.

export type CityTheme = { from: string; to: string; accent: string; dark?: boolean };

export const CITY_THEMES: Record<string, CityTheme> = {
  daegu: { from: "#ffe5dd", to: "#f2b9a5", accent: "#af5131" },
  daejeon: { from: "#e0f4e9", to: "#9fd4c3", accent: "#277e66" },
  gwangju: { from: "#eee3ff", to: "#c5b5e6", accent: "#7653a0" },
  seoul: { from: "#ffe3d6", to: "#c3b2f0", accent: "#7a63c9" },
  incheon: { from: "#d8f4ef", to: "#8ccfe2", accent: "#1d97b0" },
  suwon: { from: "#f8e6d8", to: "#dcac8e", accent: "#b8653a" },
  sokcho: { from: "#e6f3f8", to: "#a6c8da", accent: "#4f7f99" },
  gangneung: { from: "#ffe9d0", to: "#e3b48e", accent: "#8a5a3c" },
  andong: { from: "#f7ecd6", to: "#dcbf92", accent: "#a87b3a" },
  jeonju: { from: "#f8edd4", to: "#c3ddac", accent: "#6f9a4a" },
  gyeongju: { from: "#fcecbf", to: "#b6d698", accent: "#b38a26" },
  busan: { from: "#d6f0ff", to: "#78bdea", accent: "#1f78c1" },
  yeosu: { from: "#2b3678", to: "#6c50b6", accent: "#6c50b6", dark: true },
  jeju: { from: "#fff2cf", to: "#ffbb74", accent: "#f28a1c" },
};

const ART: Record<string, React.ReactNode> = {
  // 귤과 한라산
  jeju: (
    <>
      <path d="M0 98c22-20 40-30 60-30s38 10 60 30v22H0Z" fill="#e9934a" opacity="0.35" />
      <circle cx="60" cy="74" r="30" fill="#ff9324" />
      <circle cx="49" cy="63" r="9" fill="#ffc06b" opacity="0.85" />
      <g fill="#e07a12" opacity="0.6">
        <circle cx="70" cy="84" r="1.4" />
        <circle cx="76" cy="74" r="1.4" />
        <circle cx="64" cy="92" r="1.4" />
        <circle cx="52" cy="86" r="1.4" />
      </g>
      <path d="M58 45c1-4 3-6 6-7" stroke="#5a7d22" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M63 41c10-12 24-12 30-6-9 11-21 12-30 6Z" fill="#4f9a3a" />
      <path d="M66 40c8-3 15-4 22-4" stroke="#8cc770" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </>
  ),
  // 남산 위 N서울타워와 도시 불빛
  seoul: (
    <>
      <g fill="#fff" opacity="0.8">
        <circle cx="18" cy="22" r="1.5" />
        <circle cx="100" cy="16" r="1.2" />
        <circle cx="86" cy="34" r="1" />
      </g>
      <path d="M10 104c18-22 34-30 50-30s32 8 50 30v16H10Z" fill="#8f7bd0" opacity="0.55" />
      <rect x="58" y="22" width="4" height="54" rx="2" fill="#4a3d8f" />
      <rect x="51" y="44" width="18" height="9" rx="4" fill="#4a3d8f" />
      <rect x="54" y="38" width="12" height="5" rx="2.5" fill="#6c5bb8" />
      <circle cx="60" cy="18" r="2.4" fill="#ff8a6b" />
      <g fill="#5d4ca9">
        <rect x="6" y="94" width="12" height="26" />
        <rect x="20" y="86" width="10" height="34" />
        <rect x="84" y="90" width="12" height="30" />
        <rect x="98" y="82" width="14" height="38" />
      </g>
      <g fill="#ffe08a">
        <rect x="9" y="99" width="3" height="3" />
        <rect x="23" y="92" width="3" height="3" />
        <rect x="88" y="96" width="3" height="3" />
        <rect x="103" y="88" width="3" height="3" />
        <rect x="103" y="96" width="3" height="3" />
      </g>
    </>
  ),
  // 인천대교와 비행기
  incheon: (
    <>
      <path d="M82 26l18-6-4 4 8 2-3 2-9-1-6 5-3-1 3-5Z" fill="#fff" opacity="0.9" />
      <path d="M0 96h120v24H0Z" fill="#3fa7c2" opacity="0.55" />
      <path d="M48 96 60 34 72 96" stroke="#24728a" strokeWidth="5" strokeLinejoin="round" fill="none" />
      <g stroke="#24728a" strokeWidth="1.2" opacity="0.8">
        <path d="M60 40 14 84M60 48 26 84M60 56 38 84M60 40 106 84M60 48 94 84M60 56 82 84" />
      </g>
      <path d="M0 84h120" stroke="#1d5f74" strokeWidth="4" />
      <path d="M8 106c8-4 14-4 22 0s14 4 22 0M68 108c8-4 14-4 22 0s14 4 22 0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
    </>
  ),
  // 수원 화성 장안문: 돌 성문과 기와지붕
  suwon: (
    <>
      <path d="M0 76h120v44H0Z" fill="#c8977a" opacity="0.4" />
      <g fill="#a8775a">
        <path d="M0 70h8v-6h6v6h8v-6h6v6h4v50H0Z" />
        <path d="M88 70h4v-6h6v6h8v-6h6v6h8v50H88Z" />
      </g>
      <path d="M30 120V68h60v52H72V96a12 12 0 0 0-24 0v24Z" fill="#d9b59a" />
      <path d="M30 68h60" stroke="#a8775a" strokeWidth="2" />
      <rect x="38" y="50" width="44" height="18" fill="#b33f2e" />
      <path d="M22 52c14-2 24-10 38-20 14 10 24 18 38 20-4 2-10 2-14 0H36c-4 2-10 2-14 0Z" fill="#3e3a3a" />
      <path d="M30 34c10-1 20-8 30-14 10 6 20 13 30 14-4 2-8 2-12 0H42c-4 2-8 2-12 0Z" fill="#3e3a3a" />
      <rect x="44" y="34" width="32" height="14" fill="#b33f2e" />
    </>
  ),
  // 설악산 울산바위와 동해
  sokcho: (
    <>
      <circle cx="94" cy="28" r="10" fill="#fff" opacity="0.85" />
      <path d="M0 96 22 50l12 16 16-34 18 30 10-12 22 46Z" fill="#6f8fa3" />
      <path d="M50 32 44 46l8-4 6 6ZM22 50l-5 12 7-3 4 5Z" fill="#fff" opacity="0.85" />
      <path d="M0 96 30 70l18 14 24-20 22 18 26-12v26H0Z" fill="#53778c" />
      <path d="M0 100h120v20H0Z" fill="#3d87b5" />
      <path d="M10 108c8-3 14-3 22 0s14 3 22 0M66 112c8-3 14-3 22 0s14 3 22 0" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
    </>
  ),
  // 바다 위로 뜨는 해와 커피잔
  gangneung: (
    <>
      <circle cx="84" cy="62" r="22" fill="#ff9d5c" opacity="0.85" />
      <path d="M0 70h120v50H0Z" fill="#6aa9c9" opacity="0.55" />
      <path d="M66 78h48M74 86h34M84 94h18" stroke="#fff" strokeWidth="2" opacity="0.6" strokeLinecap="round" />
      <path d="M14 70h44v20a18 18 0 0 1-18 18h-8a18 18 0 0 1-18-18Z" fill="#fff" />
      <path d="M58 76h4a8 8 0 0 1 0 16h-5" stroke="#fff" strokeWidth="4" fill="none" />
      <ellipse cx="36" cy="71" rx="20" ry="3.5" fill="#7a4a2e" />
      <path d="M8 110h56" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 60c-4-6 4-8 0-14M40 60c-4-6 4-8 0-14" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9" />
    </>
  ),
  // 하회탈 양반 얼굴
  andong: (
    <>
      <path d="M30 30c0-12 60-12 60 0v36c0 22-12 36-30 36S30 88 30 66Z" fill="#f1d7a6" />
      <path d="M30 30c0-12 60-12 60 0v6c-14-6-46-6-60 0Z" fill="#a4683a" opacity="0.55" />
      <path d="M38 52c4-6 12-6 16 0M66 52c4-6 12-6 16 0" stroke="#3a2a1e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M40 48c4-3 10-3 14 0M66 48c4-3 10-3 14 0" stroke="#3a2a1e" strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M58 56v12c0 2 4 2 4 0" stroke="#b98a5a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M40 76c10 10 30 10 40 0" stroke="#3a2a1e" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M44 88c8 8 24 8 32 0" stroke="#3a2a1e" strokeWidth="1.6" fill="none" opacity="0.4" strokeLinecap="round" />
      <circle cx="40" cy="66" r="5" fill="#e9967a" opacity="0.5" />
      <circle cx="80" cy="66" r="5" fill="#e9967a" opacity="0.5" />
    </>
  ),
  // 한옥 지붕과 담
  jeonju: (
    <>
      <path d="M0 100h120v20H0Z" fill="#9cbf7d" opacity="0.6" />
      <rect x="26" y="66" width="68" height="36" fill="#f6ecd8" />
      <g stroke="#7a5a3a" strokeWidth="2">
        <path d="M26 66v36M94 66v36M60 66v36" />
        <path d="M38 76h14v16H38ZM68 76h14v16H68Z" fill="none" />
        <path d="M45 76v16M38 84h14M75 76v16M68 84h14" strokeWidth="1" />
      </g>
      <path d="M8 62c18 0 30-6 44-22h16c14 16 26 22 44 22-6 4-16 6-24 4H32c-8 2-18 0-24-4Z" fill="#3c4048" />
      <path d="M18 64c14 2 26 2 42 2s28 0 42-2" stroke="#6b7079" strokeWidth="2" fill="none" />
      <rect x="18" y="100" width="84" height="6" fill="#c9a77a" />
    </>
  ),
  // 첨성대와 고분
  gyeongju: (
    <>
      <path d="M-10 112c10-26 50-26 60 0ZM64 112c8-20 42-20 50 0Z" fill="#7fb45e" />
      <path d="M0 108h120v12H0Z" fill="#9cc77c" />
      <path d="M48 30h24v6h-3c2 24 6 46 12 70H39c6-24 10-46 12-70h-3Z" fill="#d6b16e" />
      <g stroke="#a9843f" strokeWidth="1.4" opacity="0.8">
        <path d="M50 46h20M49 56h22M47 66h26M45 76h30M43 86h34M41 96h38" />
      </g>
      <rect x="56" y="66" width="8" height="8" fill="#6b4f22" />
    </>
  ),
  // 광안대교와 파도
  busan: (
    <>
      <circle cx="26" cy="30" r="11" fill="#fff" opacity="0.8" />
      <path d="M0 92h120v28H0Z" fill="#2b86c8" />
      <g fill="#1b5f93">
        <rect x="34" y="40" width="5" height="50" />
        <rect x="82" y="40" width="5" height="50" />
      </g>
      <path d="M0 74c16 0 28-34 36-34 10 0 18 30 24 30s14-30 24-30c8 0 20 34 36 34" stroke="#1b5f93" strokeWidth="2" fill="none" />
      <g stroke="#1b5f93" strokeWidth="1" opacity="0.6">
        <path d="M44 54v28M52 64v18M68 64v18M76 54v28M20 66v16M100 66v16" />
      </g>
      <path d="M0 82h120" stroke="#164f7c" strokeWidth="4" />
      <path d="M0 104c10-6 20-6 30 0s20 6 30 0 20-6 30 0 20 6 30 0" stroke="#bfe6ff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  // 밤바다, 달, 해상케이블카
  yeosu: (
    <>
      <circle cx="92" cy="24" r="9" fill="#ffe7a3" />
      <circle cx="96" cy="21" r="8" fill="#433d8f" opacity="0.6" />
      <g fill="#fff" opacity="0.8">
        <circle cx="20" cy="18" r="1.2" />
        <circle cx="46" cy="10" r="1" />
        <circle cx="70" cy="30" r="1" />
      </g>
      <path d="M0 26 120 54" stroke="#c9c2ff" strokeWidth="1.4" />
      <path d="M58 40v6" stroke="#c9c2ff" strokeWidth="1.4" />
      <rect x="50" y="46" width="16" height="13" rx="3" fill="#ff7aa8" />
      <rect x="53" y="49" width="10" height="5" rx="1" fill="#ffe7a3" />
      <path d="M0 84c20-8 34-10 50-6l20 6h50v36H0Z" fill="#1b2050" />
      <g stroke="#ffd36e" strokeWidth="2" strokeLinecap="round" opacity="0.85">
        <path d="M20 94h10M40 100h14M70 96h8M88 104h14M30 110h8M64 112h12" />
      </g>
    </>
  ),
};

export function CityArt({ id, className }: { id: string; className?: string }) {
  if (!ART[id]) return null;
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true">
      {ART[id]}
    </svg>
  );
}
