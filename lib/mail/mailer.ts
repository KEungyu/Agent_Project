import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// 메일 발송 어댑터. 기본은 모의 모드(data/outbox/에 JSON으로 남김)다.
// 실제 모드는 발송 서비스 설정과 팀 소유 주소 허용 목록이 모두 있을 때만 켜진다 (AGENTS 제품 불변 조건 2).
// 실제 모드의 결과는 "서비스가 발송 요청을 접수함"일 뿐 업체에 전달됐거나 예약이 확정됐다는 뜻이 아니다.

export type Mail = { to: string; subject: string; body: string; idempotencyKey?: string };
export type SendResult = { message_id: string; mode: "mock" | "real" };
export type Mailer = { mode: "mock" | "real"; send(mail: Mail): SendResult | Promise<SendResult> };

export const DEFAULT_OUTBOX_DIR = path.join(process.cwd(), "data", "outbox");

export class MailError extends Error {
  constructor(
    message: string,
    readonly code: "not_allowed" | "unconfigured" | "rejected" | "unknown",
  ) {
    super(message);
    this.name = "MailError";
  }
}

// 실제로 보내지 않고 data/outbox/에 JSON 파일로 남긴다 (개발·시연용)
export function createMockMailer(outboxDir: string = process.env.OUTBOX_DIR ?? DEFAULT_OUTBOX_DIR): Mailer {
  return {
    mode: "mock",
    send(mail) {
      mkdirSync(outboxDir, { recursive: true });
      const message_id = `mock-${randomUUID()}`;
      const record = { message_id, created_at: new Date().toISOString(), to: mail.to, subject: mail.subject, body: mail.body };
      writeFileSync(path.join(outboxDir, `${message_id}.json`), JSON.stringify(record, null, 2));
      return { message_id, mode: "mock" };
    },
  };
}

// 실제 모드 설정: 키 값은 돌려주지 않고 빠진 항목 이름만 알린다
export function realMailConfig(env: Record<string, string | undefined> = process.env) {
  const missing = ["RESEND_API_KEY", "MAIL_FROM", "MAIL_ALLOWLIST"].filter((key) => !env[key]?.trim());
  const allowlist = (env.MAIL_ALLOWLIST ?? "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
  return { ok: missing.length === 0, missing, allowlist };
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

// Resend HTTP API 어댑터 (새 패키지 없이 fetch 사용). 연결 검증은 하지 않았다: 테스트 수신처·키가 생기면 확인한다.
// Idempotency-Key로 같은 승인 버전의 재시도가 중복 발송되지 않게 한다.
export function createRealMailer(env: Record<string, string | undefined> = process.env, doFetch: Fetch = fetch): Mailer {
  const config = realMailConfig(env);
  return {
    mode: "real",
    async send(mail) {
      if (!config.ok) throw new MailError(`real mail is not configured: ${config.missing.join(", ")}`, "unconfigured");
      // 허용 목록(팀 소유 주소)에 없는 곳으로는 보내지 않는다
      if (!config.allowlist.includes(mail.to.trim().toLowerCase())) throw new MailError("recipient is not on MAIL_ALLOWLIST", "not_allowed");
      let response: Response;
      try {
        response = await doFetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            ...(mail.idempotencyKey ? { "Idempotency-Key": mail.idempotencyKey } : {}),
          },
          body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.body }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch {
        // 응답을 못 받으면 접수됐는지 알 수 없다: 성공으로도 실패로도 단정하지 않는다
        throw new MailError("mail service did not answer; delivery status unknown", "unknown");
      }
      if (!response.ok) throw new MailError(`mail service rejected the message (HTTP ${response.status})`, "rejected");
      const data = (await response.json().catch(() => ({}))) as { id?: string };
      return { message_id: data.id ?? `accepted-${randomUUID()}`, mode: "real" };
    },
  };
}

export function getMailer(): Mailer {
  const mode = process.env.MAIL_MODE ?? "mock";
  if (mode === "mock") return createMockMailer();
  if (mode === "real") {
    const config = realMailConfig();
    if (!config.ok) throw new MailError(`MAIL_MODE=real needs ${config.missing.join(", ")}. Use MAIL_MODE=mock.`, "unconfigured");
    return createRealMailer();
  }
  throw new Error(`Unknown MAIL_MODE=${mode}. Use MAIL_MODE=mock.`);
}
