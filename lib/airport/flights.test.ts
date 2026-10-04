import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFlightCache, icnFlightStatus } from "./flights";

const ENV = { DATA_GO_KR_SERVICE_KEY: "test+key/=" };
const NOW = () => new Date("2026-10-09T20:00:00+09:00");
const json = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const items = (list: object[]) => ({ response: { header: { resultCode: "00" }, body: { items: list } } });

beforeEach(clearFlightCache);

describe("인천공항 실시간 운항 (공공데이터포털)", () => {
  it("키가 없거나 운항 당일이 아니면 호출하지 않는다", async () => {
    const fetcher = vi.fn();
    expect((await icnFlightStatus("arrival", "KE908", "2026-10-09T23:10+09:00", "en", { env: {}, fetch: fetcher, now: NOW })).status).toBe("unconfigured");
    expect((await icnFlightStatus("arrival", "KE908", "2026-10-10T23:10+09:00", "en", { env: ENV, fetch: fetcher, now: NOW })).status).toBe("not_today");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("도착편 주소·파라미터로 부르고, 터미널 코드·시각·게이트·벨트를 옮긴다", async () => {
    const fetcher = json(
      items([{ flightId: "KE908", scheduleDateTime: "2310", estimatedDateTime: "2342", gatenumber: "250", carousel: "12", exitnumber: "B", remark: "지연", terminalId: "P03" }]),
    );
    const result = await icnFlightStatus("arrival", "ke 908", "2026-10-09T23:10+09:00", "ja", { env: ENV, fetch: fetcher, now: NOW });
    const url = String((fetcher.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/B551177/StatusOfPassengerFlightsOdp/getPassengerArrivalsOdp?");
    expect(url).toContain("serviceKey=test%2Bkey%2F%3D");
    expect(url).toContain("flight_id=KE908");
    expect(url).toContain("lang=J");
    expect(result.data).toEqual([{ flightId: "KE908", scheduled: "23:10", estimated: "23:42", gate: "250", carousel: "12", exit: "B", remark: "지연", terminal: "T2", operatedBy: undefined }]);
  });

  it("items.item 형태도 읽고, 공동운항이면 실제 운항편을 알려 주며, 다른 편은 버린다", async () => {
    const fetcher = json({ response: { header: { resultCode: "00" }, body: { items: { item: [{ flightId: "OZ1234", scheduleDateTime: "202610091200", masterflightid: "KE902", terminalId: "P02" }, { flightId: "KE1" }] } } } });
    const result = await icnFlightStatus("departure", "OZ1234", "2026-10-09T12:00+09:00", "en", { env: ENV, fetch: fetcher, now: NOW });
    expect(String((fetcher.mock.calls[0] as unknown[])[0])).toContain("getPassengerDeparturesOdp");
    expect(result.data).toEqual([expect.objectContaining({ flightId: "OZ1234", scheduled: "12:00", operatedBy: "KE902", terminal: "T1 Concourse" })]);
  });

  it("등록되지 않은 키·결과 없음·시간 초과를 구분하고, 키 값을 결과에 담지 않는다", async () => {
    const denied = await icnFlightStatus("arrival", "KE908", "2026-10-09T23:10+09:00", "en", {
      env: ENV,
      fetch: json({ OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: "30" } } }, 403),
      now: NOW,
    });
    expect(denied.status).toBe("permission");
    expect(JSON.stringify(denied)).not.toContain("test");
    expect((await icnFlightStatus("arrival", "KE909", "2026-10-09T23:10+09:00", "en", { env: ENV, fetch: json(items([])), now: NOW })).status).toBe("empty");
    const timeout = vi.fn(async () => {
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    });
    expect((await icnFlightStatus("arrival", "KE910", "2026-10-09T23:10+09:00", "en", { env: ENV, fetch: timeout, now: NOW })).status).toBe("timeout");
  });
});
