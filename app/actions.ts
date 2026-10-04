"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MissingApiKeyError } from "@/lib/agent/llm";
import { createLlmClient } from "@/lib/agent/provider";
import { GeminiApiError } from "@/lib/agent/gemini";
import { runTurn, type TurnResult } from "@/lib/agent/turn";
import { addItineraryForm, ensureBoard, removeItineraryItem, saveStayForm, saveTripForm, setLegTransport, startNewTrip } from "@/lib/board/forms";
import { getStay, recordEvent, updateBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { isLanguageCode } from "@/lib/i18n/languages";
import { fmt, getMessages } from "@/lib/i18n/messages";
import { getMailer, MailError } from "@/lib/mail/mailer";
import { approveAndSend, ApprovalError, retranslateDraft, StaleApprovalError, type SeenVersion } from "@/lib/requests/approval";
import { addReply, applyInterpretation, confirmReplyClass, interpretReply } from "@/lib/requests/replies";
import { prepareFollowUp } from "@/lib/requests/followup";
import type { FollowUpKind } from "@/lib/requests/followup-kinds";
import { getRequest, TransitionError } from "@/lib/requests/state";
import { draftFacts, sanitizeSlots } from "@/lib/requests/drafting";
import { makePhoneScript, type PhoneScript } from "@/lib/requests/channel";
import { checkConditions } from "@/lib/requests/conditions";
import { loadRequestTypes } from "@/lib/request-types/loader";
import type { ReplyClass } from "@/lib/board/types";
import { dismissAlert, type RuleId } from "@/lib/proactive/rules";
import { estimateFare, farePeriod, type FareEstimate, type FarePeriod } from "@/lib/taxi/fare";
import { drivingRoute, geocode, geocodeCandidates, haversine, inSeoul } from "@/lib/taxi/lookup";
import { wonRate, type WonRate } from "@/lib/currency/rates";
import { kstMinutesOfDay } from "@/lib/time";
import { busLaneDetail, searchBusLanes, searchTransitPaths, subwaySchedule, type BusLane, type BusLaneDetail, type OdsayResult, type TransitPath } from "@/lib/transit/odsay";
import { checkLastTrains, type LastTrainCheck } from "@/lib/transit/lasttrain";
import { icnFlightStatus, type FlightStatusResult } from "@/lib/airport/flights";
import { getStation } from "@/lib/transit/subway";
import { nearestStations } from "@/lib/transit/nearest";

// 로그인 없이 이용자 1명이 쓰는 로컬 앱이다 (ARCHITECTURE A1). 인증 검사는 두지 않는다.

export async function saveTrip(form: FormData) {
  saveTripForm(getDb(), form);
  revalidatePath("/");
}

export async function saveStay(form: FormData) {
  saveStayForm(getDb(), form);
  revalidatePath("/");
}

export async function addItinerary(form: FormData) {
  addItineraryForm(getDb(), form);
  revalidatePath("/");
}

export async function startNewTripAction() {
  startNewTrip(getDb());
  revalidatePath("/", "layout");
}

// 노선도의 역 하나(같은 도시에 머무는 날들)를 일정에서 뺀다
export async function removeItineraryAction(dates: string[], city: string) {
  const db = getDb();
  for (const date of dates) removeItineraryItem(db, date, city);
  revalidatePath("/");
}

// 마중이 예매를 준비해 둔 구간 (결제·확정은 하지 않는다)
export async function prepareTransportAction(date: string, city: string) {
  setLegTransport(getDb(), date, city, "planned");
  revalidatePath("/");
}

// 이용자가 공식 사이트에서 예매를 마쳤다고 표시한 구간. note에는 고른 수단(예: KTX)을 남긴다.
export async function markTransportBookedAction(date: string, city: string, note: string) {
  setLegTransport(getDb(), date, city, "booked_by_user", note.slice(0, 40));
  revalidatePath("/");
}

// 화면 언어이자 마중의 답변·역번역 언어. 레이아웃의 html lang도 바뀌므로 레이아웃까지 다시 그린다.
export async function setLanguage(code: string) {
  if (!isLanguageCode(code)) return;
  const db = getDb();
  const board = ensureBoard(db);
  updateBoard(db, board.id, { user_language: code });
  recordEvent(db, board.id, "user_action", { action: "set_language", language: code });
  revalidatePath("/", "layout");
}

// 언어 패널을 폼으로도 보낼 수 있게 한다: 화면이 아직 준비(하이드레이션)되기 전에 눌러도 그 언어로 다시 열린다
export async function setLanguageFromForm(form: FormData) {
  await setLanguage(String(form.get("code") ?? ""));
}

export type ChatResult = TurnResult;

async function runChatTurn(text: string): Promise<ChatResult> {
  const db = getDb();
  const board = ensureBoard(db);
  return runTurn({ db, boardId: board.id, language: board.user_language, text, createLlm: createLlmClient });
}

export async function sendChat(message: string): Promise<ChatResult> {
  const text = message.trim();
  if (!text) return { ok: false, error: getMessages(ensureBoard(getDb()).user_language).chat.typeMessage };
  const result = await runChatTurn(text);
  revalidatePath("/");
  return result;
}

export type ApprovalResult = { ok: true } | { ok: false; error: string; stale?: boolean };

// seen: 이용자가 카드에서 본 원문 해시와 수신처. 서버의 최신 값과 다르면 처리하지 않고 최신 내용을 다시 보여준다
export async function approveAndSendAction(requestId: string, seen: SeenVersion): Promise<ApprovalResult> {
  try {
    await approveAndSend(getDb(), requestId, getMailer(), seen);
    return { ok: true };
  } catch (error) {
    if (error instanceof StaleApprovalError) {
      return { ok: false, stale: true, error: getMessages(ensureBoard(getDb()).user_language).approval.stale };
    }
    if (error instanceof ApprovalError || error instanceof TransitionError || error instanceof MailError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

// 수정 메모를 이용자 언어의 자연스러운 한 문장으로 채팅에 넘겨 마중이가 같은 초안을 다시 쓰게 한다.
// 요청 ID나 내부 지시문은 채팅에 넣지 않는다. 초안은 새 초안이 만들어진 뒤에만 바뀌므로 실패해도 기존 초안이 남는다.
export async function requestChangesAction(requestId: string, note: string): Promise<ChatResult> {
  const db = getDb();
  const board = ensureBoard(db);
  const request = getRequest(db, requestId);
  if (!request || request.status !== "pending_approval") return { ok: false, error: getMessages(board.user_language).chat.unavailable };
  const m = getMessages(board.user_language);
  const type = loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
  const where = (request.target_id && getStay(db, request.target_id)?.name) || m.agent.theBusiness;
  const typeLabel = type?.label[board.user_language] ?? type?.label.en ?? request.type_id;
  recordEvent(db, board.id, "user_action", { action: "request_changes", via: "card" }, requestId);
  const result = await runChatTurn(fmt(m.approval.changeMessage, { type: typeLabel, where, note: note.trim() || "-" }));
  revalidatePath("/");
  return result;
}

export async function retranslateAction(requestId: string): Promise<ApprovalResult> {
  const db = getDb();
  const board = ensureBoard(db);
  try {
    await retranslateDraft(db, createLlmClient(), requestId, board.user_language);
    return { ok: true };
  } catch (error) {
    if (error instanceof MissingApiKeyError || error instanceof ApprovalError) return { ok: false, error: error.message };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Claude API error ${error.status}: ${error.message}` };
    if (error instanceof GeminiApiError) {
      console.error(`[retranslate] ${error.message}`);
      const chat = getMessages(board.user_language).chat;
      return { ok: false, error: error.busy ? chat.busy : chat.unavailable };
    }
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export type ReplyResult = { ok: true; manual: boolean } | { ok: false; error: string };

// 회신을 저장하고 해석한다. LLM을 쓸 수 없으면 저장만 하고 이용자가 직접 분류하게 한다(manual).
export async function submitReplyAction(requestId: string, rawKo: string): Promise<ReplyResult> {
  const db = getDb();
  try {
    const reply = addReply(db, requestId, rawKo);
    const request = getRequest(db, requestId)!;
    const type = loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
    if (!type) return { ok: true, manual: true };
    try {
      const interpretation = await interpretReply(createLlmClient(), type, reply.raw_ko, ensureBoard(db).user_language, draftFacts(request.slots));
      applyInterpretation(db, reply, interpretation);
      return { ok: true, manual: interpretation.needs_user_check };
    } catch (error) {
      if (error instanceof MissingApiKeyError || error instanceof Anthropic.APIError || error instanceof GeminiApiError) return { ok: true, manual: true };
      throw error;
    }
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export async function confirmReplyAction(replyId: string, cls: ReplyClass): Promise<ApprovalResult> {
  try {
    confirmReplyClass(getDb(), replyId, cls);
    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

export async function dismissAlertAction(ruleId: RuleId, targetId: string) {
  const db = getDb();
  dismissAlert(db, ensureBoard(db), ruleId, targetId, new Date());
  revalidatePath("/");
}

// 회신 이후 다음 행동. 조건 수락은 바로 완료, 나머지는 초안으로 돌리고 마중에게 후속 요청을 맡긴다.
export async function followUpAction(requestId: string, kind: FollowUpKind): Promise<ChatResult | ApprovalResult> {
  const db = getDb();
  const board = ensureBoard(db);
  try {
    const request = getRequest(db, requestId);
    if (!request) return { ok: false, error: "request not found" };
    const m = getMessages(board.user_language);
    const type = loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
    const where = (request.target_id && getStay(db, request.target_id)?.name) || m.agent.theBusiness;
    const typeLabel = type?.label[board.user_language] ?? type?.label.en ?? request.type_id;
    const { prompt } = prepareFollowUp(db, requestId, kind, { m, where, typeLabel });
    if (!prompt) return { ok: true };
    return await runChatTurn(prompt);
  } catch (error) {
    if (error instanceof TransitionError) return { ok: false, error: error.message };
    throw error;
  } finally {
    revalidatePath("/");
  }
}

// 택시비 계산기: 출발지·목적지를 찾아 도로 거리를 구하고 서울 미터기 요금으로 적정 범위를 낸다.
// 장소 글자와 좌표는 OpenStreetMap 서비스로만 보내고 보드에는 저장하지 않는다.
export type TaxiPlaceInput = { text: string } | { lat: number; lng: number; label: string };
export type TaxiResult =
  | { ok: true; from: string; to: string; km: number; approx: boolean; outsideSeoul: boolean; estimate: FareEstimate; rate: WonRate | null }
  | { ok: false; error: "fromNotFound" | "toNotFound" | "same" | "tooFar" | "unsupported" | "failed" };

export async function estimateTaxiAction(input: { from: TaxiPlaceInput; to: TaxiPlaceInput; period: FarePeriod | "now"; language: string }): Promise<TaxiResult> {
  const language = isLanguageCode(input.language) ? input.language : "en";
  const resolve = async (place: TaxiPlaceInput) =>
    "text" in place ? (place.text.trim() ? await geocode(place.text.slice(0, 120), language) : null) : place;
  try {
    const from = await resolve(input.from);
    if (!from) return { ok: false, error: "fromNotFound" };
    const to = await resolve(input.to);
    if (!to) return { ok: false, error: "toNotFound" };
    if (haversine(from, to) < 150) return { ok: false, error: "same" };
    // 요금표는 서울 중형택시 기준이다. 서울을 지나지 않는 이동(부산·제주 등)에는 확정값처럼 보이는 금액을 내지 않는다
    if (!inSeoul(from) && !inSeoul(to)) return { ok: false, error: "unsupported" };
    const route = await drivingRoute(from, to);
    if (route.meters > 150_000) return { ok: false, error: "tooFar" };
    const period = input.period === "now" ? farePeriod(kstMinutesOfDay(new Date().toISOString())) : input.period;
    const outsideSeoul = inSeoul(from) !== inSeoul(to);
    return {
      ok: true,
      from: from.label,
      to: to.label,
      km: Math.round(route.meters / 100) / 10,
      approx: route.approx,
      outsideSeoul,
      estimate: estimateFare(route.meters, route.seconds, period, { outsideSeoul }),
      rate: await wonRate(language),
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// 보여주기 카드: 이용자가 직접 쓴 말(또는 목적지 이름)을 마중이가 한국어로 바꾼다. 보드에는 저장하지 않는다.
export type ShowTranslateResult = { ok: true; ko: string } | { ok: false; error: string };

const SHOW_TRANSLATE_SYSTEM = {
  sentence:
    "Translate the traveler's message into short, polite, natural Korean (해요체) for a Korean shop, restaurant or hotel worker who will read it on the traveler's phone. Keep names and numbers as they are. Do not add greetings, reasons or anything that is not in the message.",
  place:
    "Write the name of this place in Korea the way Korean people write it in Korean (for example 'Gyeongbokgung Palace' → '경복궁', 'Myeongdong Station' → '명동역'). If it is already Korean, return it unchanged. Return only the name.",
};

export async function translateForShowAction(text: string, kind: "sentence" | "place"): Promise<ShowTranslateResult> {
  const board = ensureBoard(getDb());
  const m = getMessages(board.user_language).show;
  const clean = sanitizeSlots({ text: text.trim().slice(0, 300) }).text;
  if (!clean) return { ok: false, error: m.writeEmpty };
  try {
    const { ko } = await createLlmClient().structured({
      system: SHOW_TRANSLATE_SYSTEM[kind],
      prompt: clean,
      schema: z.object({ ko: z.string() }),
      effort: "low",
    });
    return ko.trim() ? { ok: true, ko: ko.trim() } : { ok: false, error: m.writeFailed };
  } catch (error) {
    console.error(`[show] translate failed: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, error: m.writeFailed };
  }
}

// 요청 카드의 전화 대본: 이메일이 없거나 시간이 촉박할 때 숙소에 전화로 읽을 한국어 대본을 만든다.
// 앱은 전화를 걸지 않는다. 대본은 저장하지 않고 서버 메모리에만 잠깐 담아 둔다(같은 요청은 다시 만들지 않는다).
export type CallScriptResult = { ok: true; script: PhoneScript } | { ok: false; error: string };
const callScripts = ((globalThis as { __majungCallScripts?: Map<string, PhoneScript> }).__majungCallScripts ??= new Map());

export async function callScriptAction(requestId: string): Promise<CallScriptResult> {
  const db = getDb();
  const board = ensureBoard(db);
  const m = getMessages(board.user_language).requests.call;
  const request = getRequest(db, requestId);
  const type = request && loadRequestTypes().types.find((candidate) => candidate.id === request.type_id);
  if (!request || !type) return { ok: false, error: m.failed };
  // 요청에 담긴 값이 모자라면(예: 예전 요청) 보드의 숙소 정보로 채운다
  const slots = checkConditions(type, board, { targetId: request.target_id, provided: request.slots }).filled;
  const key = `${requestId}:${board.user_language}:${JSON.stringify(slots)}`;
  const cached = callScripts.get(key);
  if (cached) return { ok: true, script: cached };
  try {
    const script = await makePhoneScript(createLlmClient(), type, sanitizeSlots(slots), board.user_language);
    callScripts.set(key, script);
    return { ok: true, script };
  } catch (error) {
    console.error(`[call] script failed: ${error instanceof Error ? error.message : String(error)}`);
    return { ok: false, error: m.failed };
  }
}

// 대중교통 경로(시간·요금·버스 포함)는 ODsay로만 조회한다. 출발·도착 좌표는 노선도 데이터의 역 좌표만 쓴다(임의 좌표 없음).
// ODSAY_API_KEY가 없으면 호출하지 않고 "unconfigured"를 돌려준다 — 화면은 역 연결 경로와 공식 대안을 보여 준다.
// 경로마다 지하철 구간의 막차를 확인해 함께 돌려준다 (지금 출발 기준 추정, N04)
export async function transitPathsAction(
  fromId: string,
  toId: string,
  language: string,
): Promise<OdsayResult<(TransitPath & { lastTrain?: LastTrainCheck })[]>> {
  const from = getStation(fromId);
  const to = getStation(toId);
  if (!from || !to || from.id === to.id) return { status: "empty" };
  const result = await searchTransitPaths(from, to, isLanguageCode(language) ? language : "en");
  if (result.status !== "ok" || !result.data) return result;
  const now = new Date();
  const data = await Promise.all(
    result.data.map(async (path) => ({ ...path, lastTrain: await checkLastTrains(path, now, (stationID, wayCode) => subwaySchedule(stationID, wayCode)) })),
  );
  return { ...result, data };
}

export async function busLanesAction(busNo: string, language: string): Promise<OdsayResult<BusLane[]>> {
  const value = busNo.trim().slice(0, 12);
  if (!/^[0-9A-Za-z가-힣-]+$/.test(value)) return { status: "empty" };
  return searchBusLanes(value, isLanguageCode(language) ? language : "en");
}

export async function busLaneDetailAction(busID: number, language: string): Promise<OdsayResult<BusLaneDetail>> {
  if (!Number.isInteger(busID) || busID <= 0) return { status: "empty" };
  return busLaneDetail(busID, isLanguageCode(language) ? language : "en");
}

// 숙소·식당·입력한 장소에서 가까운 역 (N03). 좌표는 지도 검색(OpenStreetMap Nominatim) 결과만 쓰고, 같은 이름이 여럿이면 모두 돌려준다
export type PlaceStations =
  | { status: "ok"; candidates: { label: string; detail: string; stations: { id: string; meters: number }[] }[] }
  | { status: "not_found" | "out_of_area" | "error" };
export async function placeStationsAction(query: string, language: string): Promise<PlaceStations> {
  const text = query.trim().slice(0, 120);
  if (!text) return { status: "not_found" };
  try {
    const places = await geocodeCandidates(text, isLanguageCode(language) ? language : "en");
    if (places.length === 0) return { status: "not_found" };
    const candidates = places
      .map((place) => ({
        label: place.label,
        detail: place.detail,
        stations: nearestStations(place.lat, place.lng).map((near) => ({ id: near.station.id, meters: near.meters })),
      }))
      .filter((candidate) => candidate.stations.length > 0);
    return candidates.length ? { status: "ok", candidates: candidates.slice(0, 4) } : { status: "out_of_area" };
  } catch {
    return { status: "error" };
  }
}

// 인천공항 실시간 운항 현황 (공공데이터포털). 보드의 항공편 번호·날짜로만 조회하고, 운항 당일에만 부른다
export async function flightStatusAction(direction: "arrival" | "departure", language: string): Promise<FlightStatusResult> {
  const board = ensureBoard(getDb());
  const flight = direction === "arrival" ? board.arrival : board.departure;
  if (!flight?.flight_no || !flight.datetime || flight.airport !== "ICN") return { status: "empty" };
  return icnFlightStatus(direction, flight.flight_no, flight.datetime, isLanguageCode(language) ? language : "en");
}
