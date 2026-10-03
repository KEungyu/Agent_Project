import { randomUUID } from "node:crypto";
import { asc, eq, desc } from "drizzle-orm";
import type { Db } from "../db/client";
import { events, requests, stays, tripBoards } from "../db/schema";
import type {
  BoardEvent,
  EventKind,
  FieldSource,
  Request,
  Stay,
  StayFields,
  TripBoard,
} from "./types";

type BoardPatch = Partial<
  Pick<TripBoard, "user_language" | "traveler_role" | "arrival" | "departure" | "itinerary" | "proactive">
>;

const now = () => new Date().toISOString();

// DB의 null을 빠진 필드로 바꾼다 (LLM 컨텍스트와 타입을 단순하게 유지)
export function withoutNulls<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));
}

function sourcesFor(fields: Partial<StayFields>, source: FieldSource) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => [key, source]),
  ) as Stay["field_sources"];
}

export function createBoard(db: Db, init: BoardPatch = {}): TripBoard {
  const at = now();
  const id = `trip_${randomUUID()}`;
  db.insert(tripBoards)
    .values({
      id,
      user_language: init.user_language ?? "en",
      traveler_role: init.traveler_role ?? "traveler",
      arrival: init.arrival,
      departure: init.departure,
      itinerary: init.itinerary ?? [],
      proactive: init.proactive ?? { dismissed: [] },
      created_at: at,
      updated_at: at,
    })
    .run();
  return getBoard(db, id)!;
}

export function getBoard(db: Db, boardId: string): TripBoard | null {
  const board = db.select().from(tripBoards).where(eq(tripBoards.id, boardId)).get();
  if (!board) return null;
  const stayRows = db.select().from(stays).where(eq(stays.board_id, boardId)).all();
  const requestRows = db
    .select()
    .from(requests)
    .where(eq(requests.board_id, boardId))
    .orderBy(asc(requests.created_at))
    .all();
  return {
    ...(withoutNulls(board) as Omit<TripBoard, "stays" | "requests">),
    stays: stayRows.map((row) => withoutNulls(row) as Stay),
    requests: requestRows.map((row) => withoutNulls(row) as Request),
  };
}

// 이용자 1명이 한 번에 보드 1개를 쓴다 (ARCHITECTURE A1). "새 여행 시작"을 하면 새 보드를 만들므로,
// 가장 최근에 만든 보드를 돌려준다. 예전 보드는 지우지 않고 남겨 둔다.
export function getCurrentBoard(db: Db): TripBoard | null {
  const latest = db.select({ id: tripBoards.id }).from(tripBoards).orderBy(desc(tripBoards.created_at)).get();
  return latest ? getBoard(db, latest.id) : null;
}

export function updateBoard(db: Db, boardId: string, patch: BoardPatch): TripBoard {
  db.update(tripBoards)
    .set({ ...patch, updated_at: now() })
    .where(eq(tripBoards.id, boardId))
    .run();
  const board = getBoard(db, boardId);
  if (!board) throw new Error(`보드 없음: ${boardId}`);
  return board;
}

export function addStay(db: Db, boardId: string, fields: StayFields, source: FieldSource): Stay {
  const id = `stay_${randomUUID()}`;
  db.insert(stays)
    .values({ ...fields, id, board_id: boardId, field_sources: sourcesFor(fields, source) })
    .run();
  touchBoard(db, boardId);
  return getStay(db, id)!;
}

export function getStay(db: Db, stayId: string): Stay | null {
  const row = db.select().from(stays).where(eq(stays.id, stayId)).get();
  return row ? (withoutNulls(row) as Stay) : null;
}

// 값을 쓴 필드마다 출처(user / extracted)를 기록한다
export function updateStay(db: Db, stayId: string, patch: Partial<StayFields>, source: FieldSource): Stay {
  const stay = getStay(db, stayId);
  if (!stay) throw new Error(`숙소 없음: ${stayId}`);
  db.update(stays)
    .set({ ...patch, field_sources: { ...stay.field_sources, ...sourcesFor(patch, source) } })
    .where(eq(stays.id, stayId))
    .run();
  touchBoard(db, stay.board_id);
  return getStay(db, stayId)!;
}

export function recordEvent(
  db: Db,
  boardId: string,
  kind: EventKind,
  detail: Record<string, unknown> = {},
  requestId?: string,
): void {
  db.insert(events).values({ board_id: boardId, at: now(), kind, detail, request_id: requestId }).run();
}

export function listEvents(db: Db, boardId: string): BoardEvent[] {
  return db
    .select()
    .from(events)
    .where(eq(events.board_id, boardId))
    .orderBy(asc(events.id))
    .all()
    .map((row) => withoutNulls(row) as BoardEvent);
}

function touchBoard(db: Db, boardId: string) {
  db.update(tripBoards).set({ updated_at: now() }).where(eq(tripBoards.id, boardId)).run();
}
