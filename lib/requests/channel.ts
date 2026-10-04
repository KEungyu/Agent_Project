import { z } from "zod";
import type { LlmClient } from "../agent/llm";
import type { Channel, Stay } from "../board/types";
import { getLanguage } from "../i18n/languages";
import type { RequestType } from "../request-types/schema";

// 채널 판단 (ARCHITECTURE §3 decide_channel, 가정 A4).
// 마감까지 channel_rule.phone_within_hours 시간 "이내"(0 이상, 그 시간 이하)면 전화를 권하고, 이메일이 없으면 전화.
// 시간 판정은 반올림하지 않은 실제 차이로 한다. hours_left는 화면 표시용 값이다.

export type ChannelDecision = {
  channel: Channel | null;
  reason: "email_default" | "deadline_soon" | "no_email" | "no_phone_but_urgent" | "no_contact";
  hours_left?: number; // 표시용 (소수 첫째 자리)
  deadline_passed?: boolean; // 마감(예: 도착 시각)이 이미 지났다 — 급한 것이 아니라 날짜·시각 확인이 필요하다
};

// 채널 요구 키("stay_email")를 실제 값으로 바꾼다: stay_ 접두어는 숙소 필드, 나머지는 조건 값
function contactValue(key: string, stay: Stay | undefined, slots: Record<string, string>): string | undefined {
  if (key.startsWith("stay_")) {
    const value = stay?.[key.slice("stay_".length) as keyof Stay];
    return typeof value === "string" && value ? value : undefined;
  }
  return slots[key] || undefined;
}

function deadlineOf(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // 날짜만 있으면 그날 한국 시간 0시를 마감으로 본다
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function decideChannel(
  type: RequestType,
  stay: Stay | undefined,
  slots: Record<string, string>,
  now: Date,
): ChannelDecision {
  const available = (channel: Channel) =>
    type.channels.some(
      (option) => option.type === channel && option.requires.every((key) => contactValue(key, stay, slots)),
    );
  const email = available("email");
  const phone = available("phone");
  const deadline = deadlineOf(slots[type.channel_rule.deadline_slot]);
  const msLeft = deadline ? deadline.getTime() - now.getTime() : undefined;
  // 판정은 실제 시간 차이로: 0 <= 남은 시간 <= 기준 시간이면 임박. 이미 지난 마감은 임박이 아니라 낡은 값이다
  const urgent = msLeft !== undefined && msLeft >= 0 && msLeft <= type.channel_rule.phone_within_hours * 3_600_000;
  const passed = msLeft !== undefined && msLeft < 0;
  // 표시용 값은 판정과 따로 만든다 (-0이 나오지 않게 0을 더한다)
  const hours_left = msLeft === undefined ? undefined : Math.round(msLeft / 360_000) / 10 + 0;
  const withHours = { ...(hours_left === undefined ? {} : { hours_left }), ...(passed ? { deadline_passed: true } : {}) };

  if (!email && !phone) return { channel: null, reason: "no_contact", ...withHours };
  if (!email) return { channel: "phone", reason: "no_email", ...withHours };
  if (urgent && phone) return { channel: "phone", reason: "deadline_soon", ...withHours };
  if (urgent) return { channel: "email", reason: "no_phone_but_urgent", ...withHours };
  return { channel: "email", reason: "email_default", ...withHours };
}

// 한국어 전화 스크립트 (ARCHITECTURE §3 make_phone_script). 앱은 전화를 걸지 않는다: 준비 단계.
const phoneScriptSchema = z.object({
  lines: z.array(z.object({ ko: z.string(), pronunciation: z.string(), meaning: z.string() })),
  expected_replies: z.array(z.object({ ko: z.string(), meaning: z.string() })),
});
export type PhoneScript = z.infer<typeof phoneScriptSchema>;

export async function makePhoneScript(
  llm: LlmClient,
  type: RequestType,
  slots: Record<string, string>,
  language: string,
): Promise<PhoneScript> {
  const name = getLanguage(language).englishName;
  return llm.structured({
    system: `You write a short Korean phone script for a foreign traveler who does not speak Korean, so they can read it aloud to a Korean business.
Request: ${type.label.ko} (${type.label.en}). It must cover: ${type.message_guidelines.must_include.join(", ")}.
Rules:
- lines: 4 to 7 short, polite Korean sentences in speaking order (greeting first). Copy names and booking numbers exactly.
- pronunciation: how to read each line, written for a ${name} speaker (romanization for Latin-script languages, the speaker's own script otherwise).
- meaning: what each line means, in ${name}.
- expected_replies: at least 3 short Korean answers the business is likely to give, each with its meaning in ${name}.
Never include: ${type.message_guidelines.must_not_include.join(", ")}.`,
    prompt: `Facts (JSON): ${JSON.stringify(slots)}`,
    schema: phoneScriptSchema,
  });
}
