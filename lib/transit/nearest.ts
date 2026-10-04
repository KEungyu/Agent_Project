import { haversine } from "../taxi/lookup";
import { SUBWAY, inSupportedArea, type SubwayStation } from "./subway";

// 확인된 장소 좌표(지도 검색 결과)에서 가까운 역. 거리는 직선거리라 실제 걷는 길은 더 길다
export type NearStation = { station: SubwayStation; meters: number };

export function nearestStations(lat: number, lng: number, count = 3): NearStation[] {
  if (!inSupportedArea(lat, lng)) return [];
  return SUBWAY.stations
    .map((station) => ({ station, meters: Math.round(haversine({ lat, lng }, { lat: station.lat, lng: station.lon })) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, count);
}
