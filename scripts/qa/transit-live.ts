// npx tsx scripts/qa/transit-live.ts — 실제 정보 API, 성공 시 최대 7회. 키/URL은 로그에 쓰지 않는다.
import { searchTransitPaths, subwaySchedule } from "../../lib/transit/odsay";
import { checkLastTrains } from "../../lib/transit/lasttrain";
import { searchScheduledRoutes } from "../../lib/transit/scheduled";
import { findStations } from "../../lib/transit/subway";
import { reproLine, runInfo, saveRunLog } from "./run-info";

try { process.loadEnvFile(); } catch { /* 키 이름만 아래에서 안내 */ }
async function main() {
  const info = runInfo();
  const lines = ["# F3 실제 ODsay 검증", reproLine(info), `- 시작: ${info.startedAt}`, "- 실제 ODsay 사용, DB·LLM·메일·예약 사용 없음", "- 고정 기준: 2026-10-07 21:00 KST, 인천공항1터미널 → 명동"];
  let failed = 0;
  let blocked = false;
  let calls = 0;
  const record = (label: string, ok: boolean, value: unknown) => { const line = `- ${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(value)}`; lines.push(line); console.log(line); if (!ok) failed++; };
  const observed: typeof fetch = async (url, init) => {
    if (blocked) throw new Error("API calls stopped");
    calls++;
    const response = await fetch(url, init);
    const body = await response.clone().json();
    const error = Array.isArray(body.error) ? body.error[0] : body.error;
    const endpoint = new URL(String(url)).pathname.split("/").at(-1);
    if (error || !response.ok) {
      blocked = true;
      lines.push(`- API 중단: ${endpoint}, HTTP ${response.status}, code ${String(error?.code ?? "")}, auth ${/ApiKeyAuthFailed/.test(String(error?.message ?? ""))}`);
    } else if (endpoint === "searchSubwaySchedule") {
      lines.push(`- 실제 시간표 형식: ${JSON.stringify({ station: body.result?.stationName, fields: Object.keys(body.result ?? {}), sample: body.result?.weekdaySchedule?.up?.slice(0, 1) })}`);
    }
    return response;
  };
  try {
    if (!process.env.ODSAY_API_KEY) throw new Error("ODSAY_API_KEY missing");
    const from = findStations("인천공항1터미널")[0];
    const to = findStations("명동")[0];
    const options = { fetch: observed };
    const normal = await searchScheduledRoutes(from, to, "2026-10-07T21:00", false, options);
    record("F3-02 실제 시각 지정 경로", normal.status === "ok" && normal.data?.notice === "normal" && !!normal.data.paths[0]?.legs.some((leg) => leg.transfer), normal);
    if (!blocked) {
      const late = await searchScheduledRoutes(from, to, "2026-10-07T23:59", false, options);
      record("F3-03 실제 첫차/막차 대체 구분", late.status === "ok" && (late.data?.notice === "first" || late.data?.notice === "last"), late);
    }
    if (!blocked) {
      const route = await searchTransitPaths(from, to, "ko", options);
      if (route.status === "ok" && route.data?.[0]) {
        const scheduleResults: string[] = [];
        const checked = await checkLastTrains(route.data[0], new Date("2026-10-07T21:00:00+09:00"), async (id, way) => {
          const result = await subwaySchedule(id, way, options);
          scheduleResults.push(result.status);
          return result;
        });
        record("F3-04 실제 경로와 역 시간표로 막차 계산", scheduleResults.length > 0 && scheduleResults.every((status) => status === "ok"), { checked, scheduleResults });
      } else record("F3-04 실제 일반 경로 수신", false, route);
    }
  } catch { record("실행", false, "설정 또는 네트워크 오류 (비밀 값 보호를 위해 상세 생략)"); }
  lines.push(`- 호출 수: ${calls}`, `- 실패: ${failed}`, `- 추가 호출 중단: ${blocked}`);
  console.log(`기록: ${saveRunLog("transit-live", lines, info.runId)}`);
  if (failed || blocked) process.exitCode = 1;
}
void main();
