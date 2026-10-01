import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  Actor,
  Approval,
  Arrival,
  Channel,
  Departure,
  Draft,
  EventKind,
  FieldSource,
  Interpretation,
  ItineraryItem,
  ProactiveState,
  RequestStatus,
  Sent,
  StayFields,
  TravelerRole,
} from "../board/types";

// 스키마를 바꾸면 `npm run db:generate`로 drizzle/ 마이그레이션을 다시 만든다 (AGENTS.md 규칙 4: 변경 전 확인).

export const tripBoards = sqliteTable("trip_boards", {
  id: text("id").primaryKey(),
  user_language: text("user_language").notNull().default("en"),
  traveler_role: text("traveler_role").$type<TravelerRole>().notNull().default("traveler"),
  arrival: text("arrival", { mode: "json" }).$type<Arrival>(),
  departure: text("departure", { mode: "json" }).$type<Departure>(),
  itinerary: text("itinerary", { mode: "json" }).$type<ItineraryItem[]>().notNull(),
  proactive: text("proactive", { mode: "json" }).$type<ProactiveState>().notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const stays = sqliteTable("stays", {
  id: text("id").primaryKey(),
  board_id: text("board_id")
    .notNull()
    .references(() => tripBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  name_ko: text("name_ko"),
  address_ko: text("address_ko"),
  email: text("email"),
  phone: text("phone"),
  booking_ref: text("booking_ref"),
  guest_name: text("guest_name"),
  check_in_date: text("check_in_date"),
  check_out_date: text("check_out_date"),
  expected_arrival: text("expected_arrival"),
  checkin_cutoff: text("checkin_cutoff"),
  checkout_time: text("checkout_time"),
  field_sources: text("field_sources", { mode: "json" })
    .$type<Partial<Record<keyof StayFields, FieldSource>>>()
    .notNull(),
});

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  board_id: text("board_id")
    .notNull()
    .references(() => tripBoards.id, { onDelete: "cascade" }),
  type_id: text("type_id").notNull(),
  target_id: text("target_id"),
  parent_request_id: text("parent_request_id"),
  round: integer("round").notNull().default(1),
  status: text("status").$type<RequestStatus>().notNull(),
  channel: text("channel").$type<Channel>(),
  slots: text("slots", { mode: "json" }).$type<Record<string, string>>().notNull(),
  draft: text("draft", { mode: "json" }).$type<Draft>(),
  approval: text("approval", { mode: "json" }).$type<Approval>(),
  sent: text("sent", { mode: "json" }).$type<Sent>(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const replies = sqliteTable("replies", {
  id: text("id").primaryKey(),
  request_id: text("request_id")
    .notNull()
    .references(() => requests.id, { onDelete: "cascade" }),
  received_at: text("received_at").notNull(),
  raw_ko: text("raw_ko").notNull(),
  interpretation: text("interpretation", { mode: "json" }).$type<Interpretation>(),
});

export const requestHistory = sqliteTable("request_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  request_id: text("request_id")
    .notNull()
    .references(() => requests.id, { onDelete: "cascade" }),
  from_status: text("from_status").$type<RequestStatus>(),
  to_status: text("to_status").$type<RequestStatus>().notNull(),
  at: text("at").notNull(),
  actor: text("actor").$type<Actor>().notNull(),
  note: text("note"),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  board_id: text("board_id")
    .notNull()
    .references(() => tripBoards.id, { onDelete: "cascade" }),
  at: text("at").notNull(),
  kind: text("kind").$type<EventKind>().notNull(),
  request_id: text("request_id"),
  detail: text("detail", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
});
