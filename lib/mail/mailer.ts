import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Mail = { to: string; subject: string; body: string };
export type SendResult = { message_id: string; mode: "mock" | "real" };
export type Mailer = { send(mail: Mail): SendResult };

export const DEFAULT_OUTBOX_DIR = path.join(process.cwd(), "data", "outbox");

// 실제로 보내지 않고 data/outbox/에 JSON 파일로 남긴다 (개발·시연용)
export function createMockMailer(outboxDir: string = process.env.OUTBOX_DIR ?? DEFAULT_OUTBOX_DIR): Mailer {
  return {
    send(mail) {
      mkdirSync(outboxDir, { recursive: true });
      const message_id = `mock-${randomUUID()}`;
      const record = { message_id, created_at: new Date().toISOString(), ...mail };
      writeFileSync(path.join(outboxDir, `${message_id}.json`), JSON.stringify(record, null, 2));
      return { message_id, mode: "mock" };
    },
  };
}

export function getMailer(): Mailer {
  const mode = process.env.MAIL_MODE ?? "mock";
  if (mode === "mock") return createMockMailer();
  // 실제 발송은 P3-4에서 팀 소유 주소 허용 목록과 함께 구현한다
  throw new Error(`MAIL_MODE=${mode} is not supported yet. Use MAIL_MODE=mock.`);
}
