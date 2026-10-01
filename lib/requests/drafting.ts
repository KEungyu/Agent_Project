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
- Copy names and booking numbers exactly as given. Write dates and times the Korean way (e.g. 10월 20일 새벽 1시 30분).
- Mention that the guest does not read Korean well, and ask the business to reply to this email.

Also return coverage: for each required item, the exact phrase copied from body_ko that covers it.`;
}

export async function writeDraft(
  llm: LlmClient,
  type: RequestType,
  slots: Record<string, string>,
  revisionNote?: string,
) {
  const facts = sanitizeSlots(slots);
  let problems: string[] = [];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const prompt = [
      `Facts (JSON): ${JSON.stringify(facts)}`,
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

// 초안을 쓴 호출과 분리해, 한국어 원문만 보고 번역한다 (이용자가 원문을 검증하는 수단)
export async function backTranslate(llm: LlmClient, subjectKo: string, bodyKo: string, language: string) {
  const name = getLanguage(language).englishName;
  const result = await llm.structured({
    system: `Translate the Korean email into ${name} faithfully, sentence by sentence. Do not add, remove, soften, or fix anything. Keep names and numbers unchanged.`,
    prompt: `Subject: ${subjectKo}\n\n${bodyKo}`,
    schema: translationSchema,
    effort: "low",
  });
  return `Subject: ${result.subject}\n\n${result.body}`;
}

export function hashDraft(subjectKo: string, bodyKo: string): string {
  return createHash("sha256").update(`${subjectKo}\n${bodyKo}`).digest("hex");
}

export async function composeDraft(
  llm: LlmClient,
  type: RequestType,
  slots: Record<string, string>,
  language: string,
  revisionNote?: string,
): Promise<{ draft: Draft; checks: string[] }> {
  const { draft, checks } = await writeDraft(llm, type, slots, revisionNote);
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
