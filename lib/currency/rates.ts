import type { LanguageCode } from "../i18n/languages";

// 원화 금액을 이용자 나라 돈으로 어림해 보여준다(택시비 계산기). 통화는 화면 언어로 정한다.
// 환율은 키가 필요 없는 ExchangeRate-API 공개 주소에서 하루 한 번 받아 서버 메모리에 둔다(무료 이용 조건에 따라 출처를 화면에 밝힌다).
// 받지 못하면 아래 고정값(2026-10-03 기준)을 쓰고 "대략"이라고 표시한다.

export const CURRENCY_BY_LANGUAGE: Record<Exclude<LanguageCode, "ko">, string> = {
  en: "USD",
  ja: "JPY",
  "zh-CN": "CNY",
  "zh-TW": "TWD",
  vi: "VND",
  th: "THB",
  id: "IDR",
  es: "EUR",
};

// 1원당 외화
const FALLBACK: Record<string, number> = {
  USD: 0.000742,
  JPY: 0.116965,
  CNY: 0.004958,
  TWD: 0.023675,
  VND: 19.166689,
  THB: 0.02489,
  IDR: 13.282819,
  EUR: 0.000659,
};

export type WonRate = { currency: string; perWon: number; live: boolean; date?: string };

const DAY = 24 * 3_600_000;
const cache = (globalThis as { __majungRates?: { at: number; date: string; rates: Record<string, number> } });

async function liveRates() {
  if (cache.__majungRates && Date.now() - cache.__majungRates.at < DAY) return cache.__majungRates;
  const response = await fetch("https://open.er-api.com/v6/latest/KRW", { signal: AbortSignal.timeout(6000) });
  const data = (await response.json()) as { result: string; time_last_update_unix: number; rates: Record<string, number> };
  if (!response.ok || data.result !== "success") throw new Error(`rates ${response.status}`);
  cache.__majungRates = { at: Date.now(), date: new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10), rates: data.rates };
  return cache.__majungRates;
}

export async function wonRate(language: string): Promise<WonRate | null> {
  const currency = CURRENCY_BY_LANGUAGE[language as keyof typeof CURRENCY_BY_LANGUAGE];
  if (!currency) return null;
  try {
    const { rates, date } = await liveRates();
    if (rates[currency]) return { currency, perWon: rates[currency], live: true, date };
  } catch {
    // 아래 고정값으로 넘어간다
  }
  return { currency, perWon: FALLBACK[currency], live: false };
}

// 통화마다 알맞은 자릿수로 쓴다. 1,000 이상은 소수 없이, 100,000 이상(동·루피아 등)은 1,000 단위로 반올림한다.
export function formatMoney(amount: number, currency: string, locale: string): string {
  const big = amount >= 1000;
  if (amount >= 100_000) amount = Math.round(amount / 1000) * 1000;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: big ? 0 : undefined,
    minimumFractionDigits: big ? 0 : undefined,
  }).format(amount);
}
