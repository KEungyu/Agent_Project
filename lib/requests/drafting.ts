import { createHash } from "node:crypto";
import { z } from "zod";
import type { LlmClient } from "../agent/llm";
import type { Draft } from "../board/types";
import { getLanguage } from "../i18n/languages";
import type { RequestType } from "../request-types/schema";

// 한국어 요청문 작성과 역번역 (ARCHITECTURE §3 draft_request_ko, back_translate)

const CARD_NUMBER = /\b(?:\d[ -]?){13,19}\b/g;
const MAX_ATTEMPTS = 2;

const draftSchema = z.object({
  subject_ko: z.string(),
  body_ko: z.string(),
  coverage: z.array(z.object({ item: z.string(), quote: z.string() })),
});
type DraftOutput = z.infer<typeof draftSchema>;

const translationSchema = z.object({ subject: z.string(), body: z.string() });

// 13~19자리 숫자 중 Luhn 검사를 통과하는 것만 카드번호로 본다 (날짜·전화번호 오탐 방지)
function isLuhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
    sum += digit;
  }
  return sum % 10 === 0;
}

function maskCardNumbers(value: string): string {
  return value.replace(CARD_NUMBER, (match) => (isLuhnValid(match.replace(/\D/g, "")) ? "[removed]" : match));
}

export function containsCardNumber(value: string): boolean {
  return maskCardNumbers(value) !== value;
}

// 카드번호는 LLM에 보내기 전에 지운다
export function sanitizeSlots(slots: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(slots).map(([key, value]) => [key, maskCardNumbers(value)]));
}

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

// 코드로 확인할 수 있는 것만 검사한다. 빈 배열이면 통과.
export function checkDraft(type: RequestType, slots: Record<string, string>, draft: DraftOutput): string[] {
  const problems: string[] = [];
  const body = normalize(draft.body_ko);
  const { must_include, must_not_include, max_chars } = type.message_guidelines;

  if (draft.body_ko.length > max_chars) problems.push(`본문이 ${draft.body_ko.length}자로 ${max_chars}자를 넘는다`);

  for (const item of must_include) {
    const covered = draft.coverage.find((entry) => entry.item === item);
    if (!covered) problems.push(`필수 항목 누락: ${item}`);
    else if (!body.includes(normalize(covered.quote))) problems.push(`필수 항목 "${item}"의 인용 구절이 본문에 없다`);
  }

  // 이름과 예약번호는 바꾸지 않고 그대로 옮겨야 한다
  for (const [key, value] of Object.entries(slots)) {
    if ((key === "guest_name" || key.endsWith("_ref")) && !draft.body_ko.includes(value)) {
      problems.push(`${key} 값 "${value}"이 본문에 그대로 들어가지 않았다`);
    }
  }

  // 날짜·시각은 연도와 함께, 도착 시각은 24시간 표기와 KST까지 들어가야 한다
  for (const [key, value] of Object.entries(slots)) {
    if (!key.endsWith("_ko")) continue;
    const match = /^(\d{4})년 (\d{1,2})월 (\d{1,2})일/.exec(value);
    if (!match) continue;
    const [, year, month, day] = match;
    const time = /(\d{2}:\d{2})\(KST\)$/.exec(value)?.[1];
    if (time) {
      if (!body.includes(`${year}년 ${month}월 ${day}일`) || !body.includes(time) || !body.includes("KST")) {
        problems.push(`${key.replace(/_ko$/, "")} 값은 "${value}"처럼 연도·24시간 시각·KST를 모두 적어야 한다`);
      }
    } else if (body.includes(`${month}월 ${day}일`) && !body.includes(`${year}년 ${month}월 ${day}일`)) {
      problems.push(`${key.replace(/_ko$/, "")} 날짜는 "${year}년 ${month}월 ${day}일"처럼 연도를 함께 적어야 한다`);
    }
  }

  if (containsCardNumber(draft.body_ko)) problems.push("카드번호가 들어 있다");
  for (const word of must_not_include) {
    if (draft.body_ko.includes(word)) problems.push(`넣으면 안 되는 내용: ${word}`);
  }
  return problems;
}

function draftSystem(type: RequestType): string {
  const { tone, must_include, must_not_include, max_chars } = type.message_guidelines;
  return `You write short Korean business emails on behalf of a foreign traveler who does not speak Korean.
The email goes to a Korean business and asks: ${type.label.ko} (${type.label.en}).

Rules:
- Write subject_ko and body_ko in natural Korean. Tone: ${tone}.
- The body must cover every item in this list: ${must_include.join(", ")}.
- Never include: ${must_not_include.join(", ")}.
- The body must be at most ${max_chars} characters.
- Use only the facts provided. Do not invent facts, prices, or promises.
- Do not give a reason for the request (for example a flight delay) unless a reason is in the facts.
- Do not add apologies, statements about the guest's language ability, fees, or the business's permission unless they are in the facts.
- Copy names and booking numbers exactly as given.
- Dates and times: copy the "*_ko" forms in the facts exactly. They carry the year, the date, the 24-hour time and KST (e.g. 2026년 10월 10일(토) 01:00(KST)).
- The check-in date and the arrival time can be on different days (arriving after midnight). Keep each one as given and never move one to match the other.
- If the facts include dietary or allergy notes, copy each one exactly, keeping what must be avoided and every negation separate (nuts and shellfish are different). Never claim or ask for a guarantee that the food is safe.
- Ask the business to reply to this email.

Also return coverage: for each required item, the exact phrase copied from body_ko that covers it.`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-10-10T01:00+09:00" → "2026년 10월 10일(토) 01:00(KST)", "2026-10-09" → "2026년 10월 9일(금)"
export function koreanDateTime(value: string): string | undefined {
  if (!ISO_DATE.test(value) && !ISO_DATETIME.test(value)) return undefined;
  const instant = ISO_DATE.test(value) ? new Date(`${value}T12:00:00+09:00`) : new Date(value);
  if (Number.isNaN(instant.getTime())) return undefined;
  const kst = new Date(instant.getTime() + 9 * 3_600_000);
  const date = `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일(${WEEKDAY_KO.at(kst.getUTCDay())})`;
  if (ISO_DATE.test(value)) return date;
  return `${date} ${String(kst.getUTCHours()).padStart(2, "0")}:${String(kst.getUTCMinutes()).padStart(2, "0")}(KST)`;
}

// 초안에 넣을 사실: 날짜·시각 값마다 한국어 표기("*_ko")를 덧붙여 연도·24시간·KST가 빠지지 않게 한다
export function draftFacts(slots: Record<string, string>): Record<string, string> {
  const facts = sanitizeSlots(slots);
  for (const [key, value] of Object.entries(facts)) {
    const ko = koreanDateTime(value);
    if (ko) facts[`${key}_ko`] = ko;
  }
  return facts;
}

export async function writeDraft(
  llm: LlmClient,
  type: RequestType,
  slots: Record<string, string>,
  revisionNote?: string,
  previous?: { subject_ko: string; body_ko: string },
) {
  const facts = draftFacts(slots);
  let problems: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = [
      `Facts (JSON): ${JSON.stringify(facts)}`,
      // 고쳐 달라는 부분만 바꾸고 나머지 문장은 그대로 둔다 (예: 도착 시각만 바꾸기)
      previous
        ? `Previous draft:\nSubject: ${previous.subject_ko}\n${previous.body_ko}\n\nChange only what the traveler asked and what the facts now say differently. Copy every other sentence exactly as it is.`
        : "",
      revisionNote ? `The traveler asked for these changes to the previous draft: ${revisionNote}` : "",
      problems.length ? `Your previous draft had these problems. Fix all of them:\n- ${problems.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const draft = await llm.structured({ system: draftSystem(type), prompt, schema: draftSchema });
    problems = checkDraft(type, facts, draft);
    if (problems.length === 0) return { draft, checks: type.message_guidelines.must_include.map((item) => `✓ ${item}`) };
  }
  throw new Error(`Draft failed checks after ${MAX_ATTEMPTS} attempts: ${problems.join("; ")}`);
}

// 번역문 첫 줄의 "제목" 단어 (언어마다 메일에서 쓰는 말)
const SUBJECT_LABEL: Record<string, string> = {
  en: "Subject",
  ja: "件名",
  "zh-CN": "主题",
  "zh-TW": "主旨",
  vi: "Tiêu đề",
  th: "หัวเรื่อง",
  id: "Subjek",
  es: "Asunto",
  ko: "제목",
};

// 초안을 쓴 호출과 분리해, 한국어 원문만 보고 번역한다 (이용자가 원문을 검증하는 수단)
export async function backTranslate(llm: LlmClient, subjectKo: string, bodyKo: string, language: string) {
  const name = getLanguage(language).englishName;
  const result = await llm.structured({
    system: `Translate the Korean email into ${name} so the traveler can check exactly what it says.
- Keep the meaning sentence by sentence. Do not add, remove, soften, or fix anything.
- Use the natural, polite wording a native ${name} speaker would use in a hotel email, not word-for-word calques.
- Keep names, booking numbers, dates, years, 24-hour times and "KST" exactly.`,
    prompt: `Subject: ${subjectKo}\n\n${bodyKo}`,
    schema: translationSchema,
    effort: "low",
  });
  return `${SUBJECT_LABEL[language] ?? "Subject"}: ${result.subject}\n\n${result.body}`;
}

export function hashDraft(subjectKo: string, bodyKo: string): string {
  return createHash("sha256").update(`${subjectKo}\n${bodyKo}`).digest("hex");
}

// 승인 해시: 이용자가 확인한 한국어 원문과 수신처를 함께 묶는다. 수신처가 바뀌어도 재승인이 필요하다.
// (승인 기록의 draft_hash 필드에 저장한다 — 저장 구조는 그대로 두고 담는 값의 범위만 넓혔다)
export function approvalHash(subjectKo: string, bodyKo: string, to: string): string {
  return createHash("sha256").update(`${subjectKo}\n${bodyKo}\nTO:${to.trim().toLowerCase()}`).digest("hex");
}

export async function composeDraft(
  llm: LlmClient,
  type: RequestType,
  slots: Record<string, string>,
  language: string,
  revisionNote?: string,
  previous?: { subject_ko: string; body_ko: string },
): Promise<{ draft: Draft; checks: string[] }> {
  const { draft, checks } = await writeDraft(llm, type, slots, revisionNote, previous);
  const back_translation = await backTranslate(llm, draft.subject_ko, draft.body_ko, language);
  return {
    draft: {
      subject_ko: draft.subject_ko,
      body_ko: draft.body_ko,
      back_translation,
      back_translation_language: language,
      hash: hashDraft(draft.subject_ko, draft.body_ko),
    },
    checks,
  };
}
