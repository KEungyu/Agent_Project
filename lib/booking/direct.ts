// 공식 연동으로 직접 예약하는 흐름의 공통 경계 (숙소·식당 공통).
// 조회 → 최종 조건 확인 → 이용자 승인(본 버전과 묶음) → 예약 요청(멱등키) → 결과 확인.
// 실제 공급자는 공식 API·파트너 계약·승인이 있을 때만 붙인다. 지금 활성화된 것은 모의 공급자뿐이다(모의 성공은 실예약이 아니다).

export type ProviderEnv = "mock" | "sandbox" | "production";

export type Quote = {
  provider: string;
  env: ProviderEnv;
  quoteId: string;
  version: string; // 조건이 바뀌면 바뀌는 값
  target: { name: string; branch?: string };
  when: { start: string; end?: string }; // 숙소: 체크인·체크아웃 날짜, 식당: KST 시각
  party: { adults: number; children?: number; rooms?: number };
  total: { amount: number; currency: string } | null; // 확정 금액을 모르면 null
  taxesIncluded: boolean | null;
  cancellation: string | null;
  deposit: string | null; // 식당 보증금·노쇼 조건 (식사 비용과 구분)
  expiresAt?: string;
};

export type CreateResult = { status: "confirmed"; reservationId: string } | { status: "failed"; reason: string };

export interface ReservationProvider {
  name: string;
  env: ProviderEnv;
  preview(request: unknown): Promise<Quote>;
  create(quote: Quote, idempotencyKey: string): Promise<CreateResult>;
  lookup(idempotencyKey: string): Promise<"confirmed" | "failed" | "not_found" | "unknown">;
}

export type AttemptState = "awaiting_approval" | "submitting" | "unknown" | "confirmed" | "failed";
export type Attempt = { key: string; targetKey: string; quote: Quote; state: AttemptState; reservationId?: string; reason?: string };

export class DirectBookingError extends Error {
  constructor(
    message: string,
    readonly code: "stale_quote" | "expired" | "price_unconfirmed" | "result_unknown" | "already_done" | "other_channel_open" | "other",
  ) {
    super(message);
    this.name = "DirectBookingError";
  }
}

// 승인 화면에 보여 줄 수 있는 견적인지: 금액·필수 조건을 모르면 확정 견적처럼 승인받지 않고 공급자 화면에서 확인하게 한다
export function quoteIsApprovable(quote: Quote, now: Date): { ok: true } | { ok: false; reason: "price_unconfirmed" | "expired" } {
  if (quote.expiresAt && Date.parse(quote.expiresAt) <= now.getTime()) return { ok: false, reason: "expired" };
  if (!quote.total || quote.taxesIncluded === null || quote.cancellation === null) return { ok: false, reason: "price_unconfirmed" };
  return { ok: true };
}

// 시도 기록은 공급자의 멱등키로 관리한다. 같은 승인 버전을 두 번 보내지 않고, 결과가 불명확하면 조회부터 한다
export class DirectBooking {
  private attempts = new Map<string, Attempt>();

  constructor(
    private provider: ReservationProvider,
    private now: () => Date = () => new Date(),
  ) {}

  // 같은 대상(숙소·식당 지점)에 결과가 정해지지 않은 시도가 있으면 다른 채널(메일·전화)로 중복 신청하지 않는다
  openAttemptFor(targetKey: string): Attempt | undefined {
    return [...this.attempts.values()].find((attempt) => attempt.targetKey === targetKey && (attempt.state === "submitting" || attempt.state === "unknown"));
  }

  async submit(quote: Quote, seenVersion: string, targetKey: string): Promise<Attempt> {
    if (seenVersion !== quote.version) throw new DirectBookingError("화면의 조건이 최신이 아니다", "stale_quote");
    const approvable = quoteIsApprovable(quote, this.now());
    if (!approvable.ok) throw new DirectBookingError("확정 견적이 아니다", approvable.reason);
    const key = `${this.provider.name}:${quote.quoteId}:${quote.version}`;
    const existing = this.attempts.get(key);
    if (existing?.state === "confirmed") return existing; // 같은 버전은 한 번만 처리한다 (중복 클릭·재시도)
    if (existing && (existing.state === "submitting" || existing.state === "unknown")) {
      throw new DirectBookingError("이전 요청의 결과를 먼저 확인해야 한다", "result_unknown");
    }
    const attempt: Attempt = { key, targetKey, quote, state: "submitting" };
    this.attempts.set(key, attempt);
    try {
      const result = await this.provider.create(quote, key);
      if (result.status === "confirmed") Object.assign(attempt, { state: "confirmed", reservationId: result.reservationId });
      else Object.assign(attempt, { state: "failed", reason: result.reason });
    } catch {
      // 시간 초과 등으로 성공 여부를 모르면 "확인 중"으로 두고, 조회하기 전에는 다시 보내지 않는다
      attempt.state = "unknown";
    }
    return attempt;
  }

  // 결과가 불명확한 시도를 공급자에 조회해 정리한다. 실패(또는 접수 안 됨)가 확인된 뒤에만 다시 시도할 수 있다
  async reconcile(key: string): Promise<Attempt> {
    const attempt = this.attempts.get(key);
    if (!attempt) throw new DirectBookingError("시도 기록이 없다", "other");
    if (attempt.state !== "unknown") return attempt;
    const status = await this.provider.lookup(key);
    if (status === "confirmed") attempt.state = "confirmed";
    else if (status === "failed" || status === "not_found") {
      attempt.state = "failed";
      this.attempts.delete(key);
    }
    return attempt;
  }
}

// 테스트·시연용 모의 공급자. 실제 재고·가격이 아니다
export function mockProvider(behavior: { create?: "confirm" | "fail" | "timeout"; lookup?: "confirmed" | "failed" | "not_found" | "unknown" } = {}): ReservationProvider & {
  calls: { create: number; lookup: number };
} {
  const calls = { create: 0, lookup: 0 };
  return {
    name: "mock",
    env: "mock",
    calls,
    async preview() {
      throw new Error("mock preview is built by tests");
    },
    async create(_quote, key) {
      calls.create++;
      if (behavior.create === "timeout") throw new Error("timeout");
      if (behavior.create === "fail") return { status: "failed", reason: "no availability" };
      return { status: "confirmed", reservationId: `MOCK-${key.slice(-6)}` };
    },
    async lookup() {
      calls.lookup++;
      return behavior.lookup ?? "unknown";
    },
  };
}
