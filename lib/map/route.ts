import type { ItineraryItem } from "../board/types";
import { CITIES } from "./cities";

// 이용자가 입력한 도시 이름(로마자·한글)을 지도 거점 id로 바꾼다
export function cityIdOf(name: string): string | undefined {
  const key = name.trim().toLowerCase().replace(/[\s-]+/g, "");
  return CITIES.find((city) => city.name.en.toLowerCase() === key || city.name.ko === name.trim())?.id;
}

// 지도에 있는 도시는 이용자 언어 이름으로 바꾸고, 그 밖의 도시는 입력한 그대로 둔다
export function localCityName(name: string, language: string): string {
  const city = CITIES.find((candidate) => candidate.id === cityIdOf(name));
  return city?.name[language as keyof typeof city.name] ?? name;
}

export type RouteLeg = { from: string; to: string; arranged: boolean };

// 입국 공항(ICN이면 인천) → 일정 도시 순서대로 지도 위 구간을 만든다. 지도에 없는 도시는 건너뛴다.
// 공항에서 첫 도시로 가는 구간은 노선도(TripRoute)와 같이 실선, 나머지는 그 도시의 교통편 상태를 따른다.
export function routeLegs(itinerary: ItineraryItem[], arrivalAirport?: string): RouteLeg[] {
  const fromAirport = arrivalAirport === "ICN";
  const legs: RouteLeg[] = [];
  let previous = fromAirport ? "incheon" : undefined;
  for (const item of itinerary) {
    const id = cityIdOf(item.city);
    if (!id || id === previous) continue;
    if (previous) {
      const airportLeg = fromAirport && legs.length === 0;
      legs.push({ from: previous, to: id, arranged: airportLeg || item.transport.status !== "none" });
    }
    previous = id;
  }
  return legs;
}
