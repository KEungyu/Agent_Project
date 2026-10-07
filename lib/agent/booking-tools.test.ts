import { describe, expect, it } from "vitest";
import { seedDemoBoard } from "../board/demo";
import { getBoard } from "../board/store";
import { openDb } from "../db/client";
import { EXTERNAL_PROVIDERS, isExternalAction } from "../external/links";
import { hashDraft } from "../requests/drafting";
import { createRequest, transition } from "../requests/state";
import { runAgent } from "./loop";
import { createTools } from "./registry";
import { fakeLlm, message, schemaHas, toolUse } from "./testing";

const now = () => new Date("2026-10-04T12:00:00+09:00");
function setup() {
  const db = openDb(":memory:");
  const board = seedDemoBoard(db);
  return { db, boardId: board.id, stayId: board.stays[0].id };
}
const run = (db: ReturnType<typeof openDb>, boardId: string, input: object, name: string, structured?: (request: Parameters<typeof schemaHas>[0]) => unknown) =>
  runAgent({
    llm: fakeLlm([message([toolUse("t1", name, input)], "tool_use"), message([{ type: "text", text: "ok" }], "end_turn")], structured),
    tools: createTools(),
    ctx: { db, boardId, now },
    messages: [{ role: "user", content: "go" }],
    log: () => {},
  });

describe("prepare_stay_booking (B01·B03)", () => {
  it("새 숙소는 Booking.com 공식 웹 연결 행동을 돌려주고, 예약번호를 요구하거나 기존 숙소를 바꾸지 않는다", async () => {
    const { db, boardId } = setup();
    const before = JSON.stringify(getBoard(db, boardId)!.stays);
    const result = await run(db, boardId, { destination: "Busan", check_in: "2026-10-12", check_out: "2026-10-14", adults: 2, rooms: 1 }, "prepare_stay_booking");
    const output = result.toolCalls[0].output as { action: unknown; api_status: string };
    expect(result.toolCalls[0].ok).toBe(true);
    expect(isExternalAction(output.action)).toBe(true);
    expect(output.action).toMatchObject({ provider: "booking", url: EXTERNAL_PROVIDERS.booking.home, status: "site_link", mode: "site", autoOpen: false });
    expect(output.api_status).toContain("not configured");
    expect(JSON.stringify(getBoard(db, boardId)!.stays)).toBe(before);
    expect(getBoard(db, boardId)!.requests).toEqual([]);
  });

  it("체크아웃이 체크인보다 이르면 연결하지 않고 그 문제만 돌려준다", async () => {
    const { db, boardId } = setup();
    const result = await run(db, boardId, { destination: "Busan", check_in: "2026-10-14", check_out: "2026-10-12", adults: 2, rooms: 1 }, "prepare_stay_booking");
    expect(result.toolCalls[0].ok).toBe(false);
    expect(JSON.stringify(result.toolCalls[0].output)).toContain("dates_order");
  });
});

describe("open_restaurant_booking (C01·C02·C04)", () => {
  it("조건 없이도 Catchtable 영어 첫 화면을 한 번 여는 행동을 돌려주고, 식당 ID나 사전 입력을 만들지 않는다", async () => {
    const { db, boardId } = setup();
    const result = await run(db, boardId, {}, "open_restaurant_booking");
    const action = (result.toolCalls[0].output as { action: { url: string; autoOpen: boolean; summary: unknown[] } }).action;
    expect(action).toMatchObject({ provider: "catchtable", url: "https://www.catchtable.net/", autoOpen: true, status: "site_link", summary: [] });
    expect(getBoard(db, boardId)!.requests).toEqual([]);
  });

  it("알려 준 조건은 사이트에 입력할 요약으로만 담는다", async () => {
    const { db, boardId } = setup();
    const result = await run(db, boardId, { date: "2026-10-05", time: "19:00", party_size: 2 }, "open_restaurant_booking");
    const action = (result.toolCalls[0].output as { action: { url: string; summary: { value: string }[] } }).action;
    expect(action.url).toBe("https://www.catchtable.net/");
    expect(action.summary.map((row) => row.value)).toEqual(expect.arrayContaining(["19:00 KST", "2"]));
  });
});

describe("F2-20 같은 식당 문의가 진행 중이면 Catchtable을 자동으로 열지 않는다", () => {
  it.each(["pending_approval", "conditional", "info_requested"])("F2-31 %s 문의가 있는 장소는 중복 예약 경고와 함께 버튼만 둔다", async (status) => {
    const { db, boardId } = setup();
    const request = createRequest(db, { boardId, typeId: "restaurant_booking", slots: { place_name: "Mock Grill (fictional)" } }, "agent");
    transition(db, request.id, "pending_approval", "agent", { patch: { draft: { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") } } });
    db.$client.prepare("UPDATE requests SET status = ? WHERE id = ?").run(status, request.id);
    const result = await run(db, boardId, { restaurant: "mock grill (fictional)" }, "open_restaurant_booking");
    const output = result.toolCalls[0].output as { reply: string; action: { autoOpen: boolean } };
    expect(output.action.autoOpen).toBe(false);
    expect(output.reply).toContain("double booking");
    // 다른 식당은 평소대로 연다
    const other = await run(db, boardId, { restaurant: "Another Place" }, "open_restaurant_booking");
    expect((other.toolCalls[0].output as { action: { autoOpen: boolean } }).action.autoOpen).toBe(true);
  });
});

describe("식당 예약 문의 — 메일·전화 (D02·D05·D10)", () => {
  const restaurant = { place_name: "Mock Grill (fictional)", reservation_at: "2026-10-05T19:00+09:00", party_size: "2", guest_name: "Emma Smith" };
  const structured = (request: Parameters<typeof schemaHas>[0]) => {
    if (!schemaHas(request, "coverage")) return { subject: "Reservation", body: "..." };
    const facts = JSON.parse(request.prompt.split("\n")[0].replace("Facts (JSON): ", ""));
    const body = `예약자명 ${facts.guest_name}. 예약 일시 ${facts.reservation_at_ko}, 인원 ${facts.party_size}명. 예약 가능 여부 회신 부탁드립니다.`;
    return { subject_ko: "예약 문의", body_ko: body, coverage: ["예약자명", "예약 날짜와 시각", "인원", "예약 가능 여부 회신 부탁"].map((item) => ({ item, quote: item === "예약자명" ? "예약자명" : item === "인원" ? "인원" : item === "예약 날짜와 시각" ? "예약 일시" : "예약 가능 여부 회신 부탁" })) };
  };

  it("식당 메일은 이용자가 알려 준 그 식당 주소로만 가고, 숙소 이메일을 쓰지 않는다 (D10)", async () => {
    const { db, boardId } = setup();
    const result = await run(db, boardId, { type_id: "restaurant_booking", provided: { ...restaurant, place_email: "grill@example.com" } }, "draft_request", structured);
    expect(result.toolCalls[0].ok).toBe(true);
    const [request] = getBoard(db, boardId)!.requests;
    expect(request).toMatchObject({ type_id: "restaurant_booking", status: "pending_approval" });
    expect(request.slots.place_email).toBe("grill@example.com");
    expect(request.target_id).toBeUndefined();
  });

  it("식당 연락처가 없으면 만들어 내지 않고 공식 연락처를 물으라고 한다 (D02)", async () => {
    const { db, boardId } = setup();
    const result = await run(db, boardId, { type_id: "restaurant_booking", provided: restaurant }, "draft_request", structured);
    expect(result.toolCalls[0].ok).toBe(false);
    expect(JSON.stringify(result.toolCalls[0].output)).toContain("never make one up");
    expect(getBoard(db, boardId)!.requests).toEqual([]);
  });

  it("같은 식당에 답을 기다리는 신청이 있으면 다른 채널로 다시 신청하지 않는다 (D05)", async () => {
    const { db, boardId } = setup();
    const waiting = createRequest(db, { boardId, typeId: "restaurant_booking", slots: { ...restaurant, place_email: "grill@example.com" } }, "agent");
    db.$client.prepare("UPDATE requests SET status = 'awaiting_reply' WHERE id = ?").run(waiting.id);
    const result = await run(db, boardId, { type_id: "restaurant_booking", provided: { ...restaurant, place_phone: "02-000-0000" } }, "draft_request", structured);
    expect(result.toolCalls[0].ok).toBe(false);
    expect(JSON.stringify(result.toolCalls[0].output)).toContain("already waiting for a reply");
    expect(getBoard(db, boardId)!.requests).toHaveLength(1);
  });

  it("숙소 늦은 체크인 문의가 답을 기다리는 중이면 같은 문의를 새로 만들지 않는다 (D07과 같은 중복 방지)", async () => {
    const { db, boardId, stayId } = setup();
    const sent = createRequest(db, { boardId, typeId: "late_checkin", targetId: stayId, slots: {} }, "agent");
    const draft = { subject_ko: "s", body_ko: "b", back_translation: "t", hash: hashDraft("s", "b") };
    transition(db, sent.id, "pending_approval", "agent", { patch: { draft } });
    db.$client.prepare("UPDATE requests SET status = 'awaiting_reply' WHERE id = ?").run(sent.id);
    const result = await run(db, boardId, { type_id: "late_checkin" }, "draft_request");
    expect(result.toolCalls[0].ok).toBe(false);
    expect(getBoard(db, boardId)!.requests).toHaveLength(1);
  });
});
