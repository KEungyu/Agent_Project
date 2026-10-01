// 역명판처럼 한국어 지명을 병기하기 위한 표. 이용자가 로마자로 입력한 도시 이름을 찾는다.
// concept.md 지도 지역(서울·경주·전주·부산·제주·강릉·독도)과 주요 공항·연수 도시만 둔다.
const CITY_KO: Record<string, string> = {
  seoul: "서울",
  gyeongju: "경주",
  jeonju: "전주",
  busan: "부산",
  jeju: "제주",
  gangneung: "강릉",
  dokdo: "독도",
  incheon: "인천",
  daejeon: "대전",
  daegu: "대구",
  gwangju: "광주",
  suwon: "수원",
  pangyo: "판교",
  ulleungdo: "울릉도",
};

export function cityKo(name: string): string | undefined {
  return CITY_KO[name.trim().toLowerCase().replace(/[\s-]+/g, "")];
}
