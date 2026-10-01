// ARCHITECTURE §4 여행 보드 데이터 모델

export type FieldSource = "user" | "extracted";
export type TravelerRole = "traveler" | "business" | "trainee";

export type Arrival = { datetime: string; airport: string; terminal?: string; flight_no?: string };
export type Departure = { datetime?: string; airport?: string; flight_no?: string };

export type TransportStatus = "none" | "planned" | "booked_by_user";
export type ItineraryItem = { date: string; city: string; transport: { status: TransportStatus; note?: string } };

export type ProactiveState = { dismissed: { rule_id: string; target_id: string; until: string }[] };

export type StayFields = {
  name: string;
  name_ko?: string;
  address_ko?: string;
  email?: string;
  phone?: string;
  booking_ref?: string;
  guest_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  expected_arrival?: string;
  checkin_cutoff?: string;
  checkout_time?: string;
};

export type Stay = StayFields & {
  id: string;
  board_id: string;
  field_sources: Partial<Record<keyof StayFields, FieldSource>>;
};

// 요청 상태 (ARCHITECTURE §5). 전이 규칙은 M6에서 구현한다.
export type RequestStatus =
  | "draft" // 초안
  | "pending_approval" // 승인 대기
  | "sent" // 발송됨
  | "awaiting_reply" // 회신 대기
  | "done" // 완료
  | "conditional" // 조건부 수락
  | "declined" // 거절
  | "info_requested"; // 추가 정보 요청

export type Channel = "email" | "phone";
export type Actor = "user" | "agent" | "system";

export type Draft = {
  subject_ko: string;
  body_ko: string;
  back_translation: string;
  back_translation_language?: string; // 역번역 언어 코드. 없으면 영어로 본다
  hash: string;
};
export type Approval = { approved_at: string; approved_by: "user"; draft_hash: string };
export type Sent = { at: string; message_id: string; mode: "mock" | "real"; to: string };

export type Request = {
  id: string;
  board_id: string;
  type_id: string;
  target_id?: string;
  parent_request_id?: string;
  round: number;
  status: RequestStatus;
  channel?: Channel;
  slots: Record<string, string>;
  draft?: Draft;
  approval?: Approval;
  sent?: Sent;
  created_at: string;
  updated_at: string;
};

export type ReplyClass = "done" | "conditional" | "declined" | "info_requested";
export type Interpretation = {
  class: ReplyClass;
  conditions: string[];
  requested_info: string[];
  summary: string;
  confidence: number;
  needs_user_check: boolean;
  confirmed_by_user?: boolean; // 이용자가 분류를 확인했거나 직접 골랐다 (LLM을 못 쓴 경우 포함)
};
export type Reply = { id: string; request_id: string; received_at: string; raw_ko: string; interpretation?: Interpretation };

export type HistoryEntry = {
  request_id: string;
  from: RequestStatus | null;
  to: RequestStatus;
  at: string;
  actor: Actor;
  note?: string;
};

export type EventKind =
  | "user_action"
  | "tool_call"
  | "external_link"
  | "re_ask"
  | "state_change"
  | "transition_rejected";
export type BoardEvent = {
  id: number;
  board_id: string;
  at: string;
  kind: EventKind;
  request_id?: string;
  detail: Record<string, unknown>;
};

export type TripBoard = {
  id: string;
  user_language: string;
  traveler_role: TravelerRole;
  arrival?: Arrival;
  departure?: Departure;
  itinerary: ItineraryItem[];
  proactive: ProactiveState;
  stays: Stay[];
  requests: Request[];
  created_at: string;
  updated_at: string;
};
