import { expect, it } from "vitest";
import daejeon from "../../data/transit/daejeon-subway.json";
import gwangju from "../../data/transit/gwangju-subway.json";
import { findStations, type SubwayData } from "./subway";

// 운영기관 노선도와 대조한 순서. 빠진 중간역을 건너뛴 연결도 검사한다.
const routes = [
  [daejeon, "판암 신흥 대동 대전 중앙로 중구청 서대전네거리 오룡 용문 탄방 시청 정부청사 갈마 월평 갑천 유성온천 구암 현충원 월드컵경기장 노은 지족 반석"],
  [gwangju, "녹동 소태 학동·증심사입구 남광주 문화전당 금남로4가 금남로5가 양동시장 돌고개 농성 화정 쌍촌 운천 상무 김대중컨벤션센터 공항 송정공원 광주송정 도산 평동"],
] as const;

it("대전·광주 1호선은 공식 역 순서와 일치하고 다른 지역 역을 섞지 않는다", () => {
  for (const [data, names] of routes) {
    const network = data as unknown as SubwayData;
    const ordered = names.split(" ");
    expect(network.stations).toHaveLength(ordered.length);
    expect(network.lines).toHaveLength(1);
    expect(network.lines[0].edges).toHaveLength(ordered.length - 1);
    expect(network.source.license).toBe("ODbL 1.0");
    const ids = ordered.map((ko) => findStations(ko, 8, network).find((s) => s.ko === ko)!.id);
    for (let i = 1; i < ids.length; i++) {
      expect(network.lines[0].edges.some((edge) => edge.includes(ids[i - 1]) && edge.includes(ids[i]))).toBe(true);
    }
    expect(findStations("서울", 8, network)).toEqual([]);
    const codes = network.stations.flatMap((s) => Object.values(s.codes));
    expect(new Set(codes).size).toBe(codes.length);
    for (const station of network.stations) expect(station.en).toBeTruthy();
  }
});
