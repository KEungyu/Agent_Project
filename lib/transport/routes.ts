// 도시 간 이동 방법 안내 (마중 팀이 정리한 데이터). 소요 시간은 대략값이며 화면에서 "약"으로만 보여준다.
// 시간표·요금은 넣지 않는다. 예매와 결제는 이용자가 공식 사이트에서 직접 한다 (제품 불변 조건: "확정"은 구현하지 않는다).

export type TransportMode = "ktx" | "bus" | "flight" | "subway";
export type Place = { ko: string; en: string };
export type BookingSite = { name: string; url: string };
export type TransportOption = { mode: TransportMode; minutes?: number; from: Place; to: Place; booking?: BookingSite };

const KORAIL: BookingSite = { name: "Korail", url: "https://www.letskorail.com" };
const KOBUS: BookingSite = { name: "Kobus", url: "https://www.kobus.co.kr" };
const TMONEY_BUS: BookingSite = { name: "T-money Bus", url: "https://intercitybuse.tmoney.co.kr/" };
const flights = (from: string, to: string): BookingSite => ({
  name: "Google Flights",
  url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to}`)}`,
});

const P = {
  seoulStation: { ko: "서울역", en: "Seoul Station" },
  dongdaegu: { ko: "동대구역", en: "Dongdaegu Station" },
  daejeonStation: { ko: "대전역", en: "Daejeon Station" },
  gwangjuSongjeong: { ko: "광주송정역", en: "Gwangju Songjeong Station" },
  yongsan: { ko: "용산역", en: "Yongsan Station" },
  cheongnyangni: { ko: "청량리역", en: "Cheongnyangni Station" },
  seoulBus: { ko: "서울경부 고속버스터미널", en: "Seoul Express Bus Terminal" },
  centralCity: { ko: "센트럴시티터미널", en: "Central City Terminal" },
  dongSeoul: { ko: "동서울터미널", en: "Dong Seoul Terminal" },
  gimpo: { ko: "김포공항", en: "Gimpo Airport" },
  singyeongju: { ko: "경주역", en: "Gyeongju Station" },
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
  dongdaeguBus: { ko: "동대구고속버스터미널", en: "Dongdaegu Express Bus Terminal" },
  daeguAirport: { ko: "대구공항", en: "Daegu Airport" },
  daejeonBus: { ko: "대전복합터미널", en: "Daejeon Complex Terminal" },
  gwangjuBus: { ko: "광주종합버스터미널(유스퀘어)", en: "Gwangju U-Square Bus Terminal" },
  gwangjuAirport: { ko: "광주공항", en: "Gwangju Airport" },
} satisfies Record<string, Place>;

type Leg = { a: string; b: string; options: TransportOption[] };

// 한 방향으로만 적고, 반대 방향은 출발·도착을 뒤집어 쓴다. 첫 번째가 추천 수단이다.
const LEGS: Leg[] = [
  // 대구·대전·광주 (2026-10-07 추가). 소요 시간은 다른 구간처럼 대략값이며 화면에는 "약"으로만 보인다. 정확한 시각·요금은 공식 예매 화면에서 확인한다
  {
    a: "seoul",
    b: "daegu",
    options: [
      { mode: "ktx", minutes: 110, from: P.seoulStation, to: P.dongdaegu, booking: KORAIL },
      { mode: "bus", minutes: 210, from: P.seoulBus, to: P.dongdaeguBus, booking: KOBUS },
    ],
  },
  {
    a: "seoul",
    b: "daejeon",
    options: [
      { mode: "ktx", minutes: 60, from: P.seoulStation, to: P.daejeonStation, booking: KORAIL },
      { mode: "bus", minutes: 120, from: P.seoulBus, to: P.daejeonBus, booking: KOBUS },
    ],
  },
  {
    a: "seoul",
    b: "gwangju",
    options: [
      { mode: "ktx", minutes: 110, from: P.yongsan, to: P.gwangjuSongjeong, booking: KORAIL },
      { mode: "flight", minutes: 55, from: P.gimpo, to: P.gwangjuAirport, booking: flights("GMP", "KWJ") },
      { mode: "bus", minutes: 210, from: P.centralCity, to: P.gwangjuBus, booking: KOBUS },
    ],
  },
  { a: "daejeon", b: "daegu", options: [{ mode: "ktx", minutes: 50, from: P.daejeonStation, to: P.dongdaegu, booking: KORAIL }] },
  { a: "daegu", b: "busan", options: [{ mode: "ktx", minutes: 50, from: P.dongdaegu, to: P.busanStation, booking: KORAIL }] },
  { a: "daejeon", b: "busan", options: [{ mode: "ktx", minutes: 100, from: P.daejeonStation, to: P.busanStation, booking: KORAIL }] },
  {
    a: "daegu",
    b: "gyeongju",
    options: [
      { mode: "ktx", minutes: 20, from: P.dongdaegu, to: P.singyeongju, booking: KORAIL },
      { mode: "bus", minutes: 60, from: P.dongdaeguBus, to: P.gyeongjuBus, booking: TMONEY_BUS },
    ],
  },
  { a: "daegu", b: "andong", options: [{ mode: "bus", minutes: 80, from: P.dongdaeguBus, to: P.andongBus, booking: TMONEY_BUS }] },
  { a: "daegu", b: "jeju", options: [{ mode: "flight", minutes: 60, from: P.daeguAirport, to: P.jejuAirport, booking: flights("TAE", "CJU") }] },
  { a: "daejeon", b: "jeonju", options: [{ mode: "bus", minutes: 80, from: P.daejeonBus, to: P.jeonjuBus, booking: TMONEY_BUS }] },
  { a: "gwangju", b: "jeonju", options: [{ mode: "bus", minutes: 90, from: P.gwangjuBus, to: P.jeonjuBus, booking: KOBUS }] },
  { a: "gwangju", b: "yeosu", options: [{ mode: "bus", minutes: 100, from: P.gwangjuBus, to: P.yeosuBus, booking: TMONEY_BUS }] },
  { a: "gwangju", b: "busan", options: [{ mode: "bus", minutes: 210, from: P.gwangjuBus, to: P.busanSeobu, booking: KOBUS }] },
  { a: "gwangju", b: "jeju", options: [{ mode: "flight", minutes: 50, from: P.gwangjuAirport, to: P.jejuAirport, booking: flights("KWJ", "CJU") }] },
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
  { a: "suwon", b: "busan", options: [{ mode: "ktx", minutes: 170, from: P.suwonStation, to: P.busanStation, booking: KORAIL }] },
  { a: "jeonju", b: "yeosu", options: [{ mode: "ktx", minutes: 80, from: P.jeonjuStation, to: P.yeosuExpo, booking: KORAIL }] },
  { a: "yeosu", b: "jeju", options: [{ mode: "flight", minutes: 50, from: P.yeosuAirport, to: P.jejuAirport, booking: flights("RSU", "CJU") }] },
];

function flip(option: TransportOption): TransportOption {
  return { ...option, from: option.to, to: option.from, ...(option.mode === "flight" ? { booking: flights(option.to.en, option.from.en) } : {}) };
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

// 바로 가는 구간이 없으면 다른 도시 한 곳을 거쳐 가는 길을 찾는다. 각 구간의 추천 수단끼리 잇고,
// 같은 역에서 바꾸는 경우만 계획용 여유 30분을 더한다. 다른 터미널이면 총시간 미확인으로 둔다.
export type ViaRoute = { hub: string; legs: [TransportOption, TransportOption]; minutes?: number };
const TRANSFER_MINUTES = 30;

export function viaRoutes(fromId: string, toId: string, cityIds: string[]): ViaRoute[] {
  if (fromId === toId || transportOptions(fromId, toId).length > 0) return [];
  return cityIds
    .filter((hub) => hub !== fromId && hub !== toId)
    .flatMap((hub): ViaRoute[] => {
      const [first] = transportOptions(fromId, hub);
      const [second] = transportOptions(hub, toId);
      if (!first || !second) return [];
      // ponytail: 서로 다른 공항·역 사이의 이동은 자료가 없어 총시간을 만들지 않는다.
      const samePlace = first.to.ko === second.from.ko;
      return [{ hub, legs: [first, second], minutes: samePlace && first.minutes && second.minutes ? first.minutes + second.minutes + TRANSFER_MINUTES : undefined }];
    })
    .sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity))
    .slice(0, 2);
}
