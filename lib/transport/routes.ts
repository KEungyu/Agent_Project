// 도시 간 이동 방법 안내 (마중 팀이 정리한 데이터). 소요 시간은 대략값이며 화면에서 "약"으로만 보여준다.
// 시간표·요금은 넣지 않는다. 예매와 결제는 이용자가 공식 사이트에서 직접 한다 (제품 불변 조건: "확정"은 구현하지 않는다).

export type TransportMode = "ktx" | "bus" | "flight" | "subway";
export type Place = { ko: string; en: string };
export type BookingSite = { name: string; url: string };
export type TransportOption = { mode: TransportMode; minutes?: number; from: Place; to: Place; booking?: BookingSite };

const KORAIL: BookingSite = { name: "Korail", url: "https://www.letskorail.com" };
const KOBUS: BookingSite = { name: "Kobus", url: "https://www.kobus.co.kr" };
const TMONEY_BUS: BookingSite = { name: "T-money Bus", url: "https://txbus.t-money.co.kr" };
const flights = (from: string, to: string): BookingSite => ({
  name: "Google Flights",
  url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to}`)}`,
});

const P = {
  seoulStation: { ko: "서울역", en: "Seoul Station" },
  yongsan: { ko: "용산역", en: "Yongsan Station" },
  cheongnyangni: { ko: "청량리역", en: "Cheongnyangni Station" },
  seoulBus: { ko: "서울경부 고속버스터미널", en: "Seoul Express Bus Terminal" },
  centralCity: { ko: "센트럴시티터미널", en: "Central City Terminal" },
  dongSeoul: { ko: "동서울터미널", en: "Dong Seoul Terminal" },
  gimpo: { ko: "김포공항", en: "Gimpo Airport" },
  singyeongju: { ko: "신경주역", en: "Singyeongju Station" },
  gyeongjuBus: { ko: "경주터미널", en: "Gyeongju Terminal" },
  busanStation: { ko: "부산역", en: "Busan Station" },
  busanBus: { ko: "부산종합터미널", en: "Busan Central Bus Terminal" },
  busanSeobu: { ko: "부산서부터미널", en: "Busan Seobu Terminal" },
  gimhae: { ko: "김해공항", en: "Gimhae Airport" },
  jeonjuStation: { ko: "전주역", en: "Jeonju Station" },
  jeonjuBus: { ko: "전주고속버스터미널", en: "Jeonju Express Bus Terminal" },
  gangneungStation: { ko: "강릉역", en: "Gangneung Station" },
  gangneungBus: { ko: "강릉고속버스터미널", en: "Gangneung Express Bus Terminal" },
  sokchoBus: { ko: "속초고속버스터미널", en: "Sokcho Express Bus Terminal" },
  andongStation: { ko: "안동역", en: "Andong Station" },
  andongBus: { ko: "안동터미널", en: "Andong Terminal" },
  yeosuExpo: { ko: "여수엑스포역", en: "Yeosu EXPO Station" },
  yeosuAirport: { ko: "여수공항", en: "Yeosu Airport" },
  yeosuBus: { ko: "여수종합버스터미널", en: "Yeosu Bus Terminal" },
  jejuAirport: { ko: "제주공항", en: "Jeju Airport" },
  suwonStation: { ko: "수원역", en: "Suwon Station" },
  incheonStation: { ko: "인천역", en: "Incheon Station" },
} satisfies Record<string, Place>;

type Leg = { a: string; b: string; options: TransportOption[] };

// 한 방향으로만 적고, 반대 방향은 출발·도착을 뒤집어 쓴다. 첫 번째가 추천 수단이다.
const LEGS: Leg[] = [
  {
    a: "seoul",
    b: "gyeongju",
    options: [
      { mode: "ktx", minutes: 130, from: P.seoulStation, to: P.singyeongju, booking: KORAIL },
      { mode: "bus", minutes: 225, from: P.seoulBus, to: P.gyeongjuBus, booking: KOBUS },
    ],
  },
  {
    a: "gyeongju",
    b: "busan",
    options: [
      { mode: "ktx", minutes: 30, from: P.singyeongju, to: P.busanStation, booking: KORAIL },
      { mode: "bus", minutes: 60, from: P.gyeongjuBus, to: P.busanBus, booking: TMONEY_BUS },
    ],
  },
  {
    a: "seoul",
    b: "busan",
    options: [
      { mode: "ktx", minutes: 160, from: P.seoulStation, to: P.busanStation, booking: KORAIL },
      { mode: "flight", minutes: 60, from: P.gimpo, to: P.gimhae, booking: flights("GMP", "PUS") },
      { mode: "bus", minutes: 255, from: P.seoulBus, to: P.busanBus, booking: KOBUS },
    ],
  },
  {
    a: "seoul",
    b: "jeonju",
    options: [
      { mode: "ktx", minutes: 100, from: P.yongsan, to: P.jeonjuStation, booking: KORAIL },
      { mode: "bus", minutes: 165, from: P.centralCity, to: P.jeonjuBus, booking: KOBUS },
    ],
  },
  {
    a: "seoul",
    b: "gangneung",
    options: [
      { mode: "ktx", minutes: 115, from: P.seoulStation, to: P.gangneungStation, booking: KORAIL },
      { mode: "bus", minutes: 150, from: P.dongSeoul, to: P.gangneungBus, booking: KOBUS },
    ],
  },
  { a: "seoul", b: "sokcho", options: [{ mode: "bus", minutes: 150, from: P.seoulBus, to: P.sokchoBus, booking: KOBUS }] },
  {
    a: "seoul",
    b: "andong",
    options: [
      { mode: "ktx", minutes: 120, from: P.cheongnyangni, to: P.andongStation, booking: KORAIL },
      { mode: "bus", minutes: 170, from: P.dongSeoul, to: P.andongBus, booking: KOBUS },
    ],
  },
  {
    a: "seoul",
    b: "yeosu",
    options: [
      { mode: "ktx", minutes: 180, from: P.yongsan, to: P.yeosuExpo, booking: KORAIL },
      { mode: "flight", minutes: 60, from: P.gimpo, to: P.yeosuAirport, booking: flights("GMP", "RSU") },
    ],
  },
  { a: "seoul", b: "suwon", options: [{ mode: "subway", minutes: 60, from: P.seoulStation, to: P.suwonStation }] },
  { a: "seoul", b: "incheon", options: [{ mode: "subway", minutes: 60, from: P.seoulStation, to: P.incheonStation }] },
  { a: "seoul", b: "jeju", options: [{ mode: "flight", minutes: 70, from: P.gimpo, to: P.jejuAirport, booking: flights("GMP", "CJU") }] },
  { a: "busan", b: "jeju", options: [{ mode: "flight", minutes: 60, from: P.gimhae, to: P.jejuAirport, booking: flights("PUS", "CJU") }] },
  { a: "busan", b: "yeosu", options: [{ mode: "bus", minutes: 180, from: P.busanSeobu, to: P.yeosuBus, booking: TMONEY_BUS }] },
  { a: "gangneung", b: "sokcho", options: [{ mode: "bus", minutes: 60, from: P.gangneungBus, to: P.sokchoBus, booking: TMONEY_BUS }] },
];

function flip(option: TransportOption): TransportOption {
  return { ...option, from: option.to, to: option.from };
}

// 이 구간에 예매가 필요한지. 지하철처럼 예매할 수단만 있는 구간이 아니면(모르는 구간 포함) 필요하다고 본다.
export function bookingNeeded(fromId?: string, toId?: string): boolean {
  if (!fromId || !toId) return true;
  const options = transportOptions(fromId, toId);
  return options.length === 0 || options.some((option) => option.booking);
}

// 두 도시(지도 거점 id) 사이의 이동 방법. 모르는 구간은 빈 배열을 돌려준다.
export function transportOptions(fromId: string, toId: string): TransportOption[] {
  const forward = LEGS.find((leg) => leg.a === fromId && leg.b === toId);
  if (forward) return forward.options;
  const backward = LEGS.find((leg) => leg.a === toId && leg.b === fromId);
  if (backward) return backward.options.map(flip);
  return [];
}
