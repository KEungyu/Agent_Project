// 공항 → 시내 이동 수단 (concept.md ② 공항 도착, PRD F-06). 마중이 팀이 정리한 안내 데이터.
// 소요 시간은 대략값, 운행 시각·요금은 넣지 않는다. 예약·결제는 이용자가 공식 사이트에서 직접 한다.

export type TransferId = "intlTaxi" | "nightBus" | "arex" | "limousine" | "taxi" | "subway";
export type Transfer = {
  id: TransferId;
  icon: "taxi" | "bus" | "train";
  minutes?: number;
  // 심야(23:00~05:00)에도 탈 수 있는지
  night: boolean;
  // 예약이 되는 수단이면 "준비"(공식 예약 화면으로 넘기기), 아니면 "안내"
  level: "안내" | "준비";
  link?: { name: string; url: string; kind: "book" | "info" };
};

const AIRPORT_KR = { name: "Incheon Airport", url: "https://www.airport.kr", kind: "info" } as const;

const TRANSFERS: Record<string, Transfer[]> = {
  ICN: [
    { id: "arex", icon: "train", minutes: 45, night: false, level: "안내", link: { name: "AREX", url: "https://www.airportrailroad.com", kind: "info" } },
    { id: "limousine", icon: "bus", minutes: 70, night: false, level: "안내", link: AIRPORT_KR },
    // 서울시 지정 인터내셔널 택시: 온라인 예약, 구역별 정찰 요금, 영어·중국어·일본어 기사
    { id: "intlTaxi", icon: "taxi", minutes: 60, night: true, level: "준비", link: { name: "International Taxi", url: "https://www.intltaxi.co.kr", kind: "book" } },
    { id: "nightBus", icon: "bus", minutes: 70, night: true, level: "안내", link: AIRPORT_KR },
    { id: "taxi", icon: "taxi", minutes: 60, night: true, level: "안내" },
  ],
  GMP: [
    { id: "subway", icon: "train", minutes: 35, night: false, level: "안내", link: { name: "Gimpo Airport", url: "https://www.airport.co.kr/gimpo", kind: "info" } },
    { id: "taxi", icon: "taxi", minutes: 40, night: true, level: "안내" },
  ],
};

// 밤 11시부터 새벽 5시 사이 도착 (R5 심야 도착 규칙과 같은 취지)
export function isLateHour(minutesOfDay: number): boolean {
  return minutesOfDay >= 23 * 60 || minutesOfDay < 5 * 60;
}

// 도착 공항과 시각에 맞춰 순서를 정한다. 심야에는 밤에도 다니는 수단을 앞에, 다니지 않는 수단은 뒤로 보내고 표시한다.
export function airportTransfers(airport: string | undefined, late: boolean): (Transfer & { available: boolean })[] {
  // 심야 공항버스는 심야에만 보여준다
  const list = ((airport && TRANSFERS[airport]) || []).filter((item) => late || item.id !== "nightBus");
  const marked = list.map((item) => ({ ...item, available: !late || item.night }));
  if (!late) return marked;
  return [...marked.filter((item) => item.available), ...marked.filter((item) => !item.available)];
}
