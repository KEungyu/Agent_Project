// 택시비 계산기용 위치 찾기(OpenStreetMap Nominatim)와 도로 경로(OSRM 공개 서버).
// 두 서비스 모두 키가 필요 없다. 이용 정책에 따라 User-Agent를 밝히고, 같은 질문은 메모리에 담아 다시 묻지 않는다.

export type Place = { lat: number; lng: number; label: string };
export type Route = { meters: number; seconds: number; approx: boolean };

const UA = "MajungiClassProject/1.0 (student demo app)";
const TIMEOUT = 8000;
const geocodeCache = new Map<string, Place | null>();

export async function geocode(query: string, language: string): Promise<Place | null> {
  const key = `${language}:${query.trim().toLowerCase()}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key)!;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: query.trim(), format: "jsonv2", limit: "5", countrycodes: "kr", "accept-language": `${language},en` }).toString();
  const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  const hits = (await response.json()) as { lat: string; lon: string; name?: string; display_name: string; category?: string }[];
  // "명동역"이 "명동역 가는길" 같은 도로 이름에 먼저 걸리지 않게, 역 → 도로가 아닌 곳 → 첫 결과 순으로 고른다
  const hit = hits.find((candidate) => candidate.category === "railway") ?? hits.find((candidate) => candidate.category !== "highway") ?? hits[0];
  // 찾은 곳의 이름("CGV 명동역 투썸" 등)보다 이용자가 쓴 이름이 알아보기 쉽다
  const place = hit ? { lat: Number(hit.lat), lng: Number(hit.lon), label: query.trim() } : null;
  geocodeCache.set(key, place);
  return place;
}

// 같은 이름의 여러 지점을 이용자가 고를 수 있게 후보를 모두 돌려준다 (지하철 경로의 출발·도착 장소용).
// 좌표는 Nominatim 결과만 쓴다. 찾지 못하면 빈 목록이다
const candidateCache = new Map<string, (Place & { detail: string })[]>();
export async function geocodeCandidates(query: string, language: string, fetcher: typeof fetch = fetch): Promise<(Place & { detail: string })[]> {
  const key = `${language}:${query.trim().toLowerCase()}`;
  if (candidateCache.has(key)) return candidateCache.get(key)!;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ q: query.trim(), format: "jsonv2", limit: "5", countrycodes: "kr", "accept-language": `${language},en` }).toString();
  const response = await fetcher(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  const hits = (await response.json()) as { lat: string; lon: string; name?: string; display_name: string; category?: string }[];
  const places = hits
    .filter((hit) => hit.category !== "highway")
    .map((hit) => ({
      lat: Number(hit.lat),
      lng: Number(hit.lon),
      label: hit.name || query.trim(),
      // 같은 이름을 구분할 수 있게 주소 앞부분(동·구)을 함께 보여 준다
      detail: hit.display_name.split(",").slice(1, 3).map((part) => part.trim()).join(", "),
    }));
  candidateCache.set(key, places);
  return places;
}

export async function drivingRoute(from: Place, to: Place): Promise<Route> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const response = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(TIMEOUT) });
    const data = (await response.json()) as { code: string; routes?: { distance: number; duration: number }[] };
    const route = data.routes?.[0];
    if (response.ok && data.code === "Ok" && route) return { meters: route.distance, seconds: route.duration, approx: false };
  } catch {
    // 경로 서버가 안 되면 아래 직선거리 추정으로 넘어간다
  }
  // 도로는 직선보다 대략 1.35배 길고, 도심 평균 시속 25km로 본다
  const meters = haversine(from, to) * 1.35;
  return { meters, seconds: meters / (25_000 / 3600), approx: true };
}

export function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// 서울시 경계를 사각형으로 어림한다. 시계외 할증 여부를 가늠하는 데만 쓴다.
export function inSeoul({ lat, lng }: { lat: number; lng: number }): boolean {
  return lat > 37.413 && lat < 37.715 && lng > 126.764 && lng < 127.184;
}
