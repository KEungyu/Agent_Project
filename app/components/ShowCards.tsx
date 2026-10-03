"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { translateForShowAction } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import {
  AIRPORT_KO,
  DIET_KEYS,
  DIET_KO,
  PHARMACY_KEYS,
  PHARMACY_KO,
  SHOPPING_KEYS,
  SHOPPING_KO,
  SHOW_KO,
} from "@/lib/show/phrases";
import { BagIcon, BedIcon, FoodIcon, PenIcon, PillIcon, PlaneIcon, ShowIcon, TaxiIcon, XIcon } from "./icons";
import { SignTitle } from "./SignTitle";

// 보여주기 카드 (PRD F-11, BACKLOG P2-1): 택시 기사님이나 가게 직원에게 화면을 그대로 보여준다.
// 한국어를 아주 크게, 이용자가 뜻을 알 수 있게 번역을 작게 함께 둔다. 카드는 3D로 뒤집히며 펼쳐진다.
// 택시는 카드 하나로 "○○까지 가 주세요."만 보여주고, 목록에 없는 말은 마중이가 한국어로 바꿔 카드로 만든다.

export const SHOW_EVENT = "majungi:show";
const STORAGE = { diet: "majungi-diet", pharmacy: "majungi-pharmacy", shopping: "majungi-shopping" } as const;

export type TaxiTarget = { kind: "stay"; id: string } | { kind: "airport"; code: string } | { kind: "text"; text: string };
export type ShowEventDetail = { to: TaxiTarget; from?: TaxiTarget };

type StayCard = { id: string; name: string; address?: string };
type CardIcon = "taxi" | "food" | "pharmacy" | "shopping" | "write";
type Card = { icon: CardIcon; title: string; ko: string[]; koFrom?: string; local: string[]; warn?: string };
type ChipGroup = "diet" | "pharmacy" | "shopping";

const AIRPORTS = Object.keys(AIRPORT_KO);
const HANGUL = /[가-힣]/;
// "I'm vegetarian: no meat…" → 칩에는 콜론 앞만 쓴다
const chipLabel = (sentence: string) => sentence.split(/[:：]/)[0].replace(/[.。!！?？]$/, "").trim();

function useStoredChips<K extends string>(key: string) {
  const [chips, setChips] = useState<K[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) setChips(JSON.parse(saved));
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 기억한다
    }
  }, [key]);
  // 빠르게 여러 개를 눌러도 앞의 선택이 사라지지 않도록 이전 값에서 계산한다
  const toggle = (chip: K) =>
    setChips((current) => {
      const next = current.includes(chip) ? current.filter((item) => item !== chip) : [...current, chip];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // 무시
      }
      return next;
    });
  return [chips, toggle] as const;
}

export function ShowCards({ stays, m, airports }: { stays: StayCard[]; m: Messages["show"]; airports: Messages["airports"] }) {
  const [card, setCard] = useState<Card | null>(null);
  const [diet, toggleDiet] = useStoredChips<(typeof DIET_KEYS)[number]>(STORAGE.diet);
  const [symptoms, toggleSymptom] = useStoredChips<(typeof PHARMACY_KEYS)[number]>(STORAGE.pharmacy);
  const [questions, toggleQuestion] = useStoredChips<(typeof SHOPPING_KEYS)[number]>(STORAGE.shopping);
  const [taxiTo, setTaxiTo] = useState<TaxiTarget | null>(null);
  const [taxiToText, setTaxiToText] = useState("");
  const [taxiFromText, setTaxiFromText] = useState("");
  const [writeText, setWriteText] = useState("");
  const [error, setError] = useState<{ where: "taxi" | "write"; text: string } | null>(null);
  const [taxiPending, startTaxi] = useTransition();
  const [writePending, startWrite] = useTransition();

  // 목적지 하나를 한국어 이름(+작은 보조 줄)과 이용자 언어 이름으로 바꾼다. 한글이 없는 글자는 마중이가 한국어 이름으로 바꾼다.
  const resolve = useCallback(
    async (target: TaxiTarget): Promise<{ ko: string; sub?: string; local: string; warn?: string } | { error: string }> => {
      if (target.kind === "stay") {
        const stay = stays.find((candidate) => candidate.id === target.id);
        if (!stay) return { error: m.writeFailed };
        return { ko: stay.name, sub: stay.address, local: stay.name, warn: stay.address ? undefined : m.noAddress };
      }
      if (target.kind === "airport") {
        const local = airports[target.code as keyof Messages["airports"]] ?? target.code;
        return { ko: AIRPORT_KO[target.code], sub: SHOW_KO.airportDepartures, local };
      }
      const text = target.text.trim();
      if (HANGUL.test(text)) return { ko: text, local: text };
      const result = await translateForShowAction(text, "place");
      return result.ok ? { ko: result.ko, local: text } : { error: result.error };
    },
    [stays, airports, m],
  );

  const openTaxi = useCallback(
    (detail: ShowEventDetail) => {
      setError(null);
      startTaxi(async () => {
        const [to, from] = await Promise.all([resolve(detail.to), detail.from ? resolve(detail.from) : Promise.resolve(null)]);
        if ("error" in to) return setError({ where: "taxi", text: to.error });
        const fromOk = from && !("error" in from) ? from : null;
        setCard({
          icon: "taxi",
          title: m.taxiTitle,
          ko: [SHOW_KO.taxiTo(to.ko), ...(to.sub ? [to.sub] : [])],
          koFrom: fromOk ? SHOW_KO.taxiFrom(fromOk.ko) : undefined,
          local: [fmt(m.taxiNote, { place: to.local }), ...(fromOk ? [fmt(m.taxiFromNote, { place: fromOk.local })] : [])],
          warn: to.warn,
        });
      });
    },
    [m, resolve],
  );

  // 숙소 카드의 "택시 기사님께 보여주기"와 택시비 계산기의 "기사님께 보여주기"가 이 이벤트로 택시 카드를 연다
  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<ShowEventDetail>).detail;
      if (detail?.to) openTaxi(detail);
    };
    window.addEventListener(SHOW_EVENT, open);
    return () => window.removeEventListener(SHOW_EVENT, open);
  }, [openTaxi]);

  const showTaxi = () => {
    const to = taxiToText.trim() ? ({ kind: "text", text: taxiToText } as const) : taxiTo;
    if (!to) return setError({ where: "taxi", text: m.taxiPickTo });
    openTaxi({ to, from: taxiFromText.trim() ? { kind: "text", text: taxiFromText } : undefined });
  };

  const showWrite = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startWrite(async () => {
      const result = await translateForShowAction(writeText, "sentence");
      if (!result.ok) return setError({ where: "write", text: result.error });
      setCard({ icon: "write", title: m.writeTitle, ko: [result.ko], local: [m.writeNote, writeText.trim()] });
    });
  };

  const chipCard = (group: ChipGroup): Card =>
    group === "diet"
      ? { icon: "food", title: m.foodTitle, ko: [SHOW_KO.food, ...diet.map((key) => DIET_KO[key]), SHOW_KO.thanks], local: [m.foodNote, ...diet.map((key) => m.diet[key])] }
      : group === "pharmacy"
        ? {
            icon: "pharmacy",
            title: m.pharmacyTitle,
            ko: [SHOW_KO.pharmacy, ...symptoms.map((key) => PHARMACY_KO[key]), SHOW_KO.thanks],
            local: [m.pharmacyNote, ...symptoms.map((key) => m.symptoms[key])],
          }
        : {
            icon: "shopping",
            title: m.shoppingTitle,
            ko: [SHOW_KO.shopping, ...questions.map((key) => SHOPPING_KO[key]), SHOW_KO.thanks],
            local: [m.shoppingNote, ...questions.map((key) => m.shopping[key])],
          };

  return (
    <div className="sign show-cards" id="show-cards">
      <SignTitle as="h3" ko="보여주기 카드" text={m.title} />
      <p className="show-sub">{m.sub}</p>
      <div className="show-grid">
        <article className="show-tile tone-taxi is-wide">
          <span className="show-tile-icon" aria-hidden="true">
            <TaxiIcon />
          </span>
          <div className="show-tile-text">
            <p className="show-tile-title">{m.taxiTitle}</p>
            <p className="show-tile-sub">{m.taxiSub}</p>
          </div>
          <div className="show-taxi-fields">
            <label className="show-taxi-field">
              <span>
                <span className="taxi-dot is-from" aria-hidden="true" />
                {m.taxiFrom}
              </span>
              <input className="field" value={taxiFromText} maxLength={120} placeholder={m.taxiFromPlaceholder} onChange={(event) => setTaxiFromText(event.target.value)} />
            </label>
            <label className="show-taxi-field">
              <span>
                <span className="taxi-dot is-to" aria-hidden="true" />
                {m.taxiTo}
              </span>
              <input
                className="field"
                value={taxiToText}
                maxLength={120}
                placeholder={m.taxiToPlaceholder}
                onChange={(event) => {
                  setTaxiToText(event.target.value);
                  if (event.target.value) setTaxiTo(null);
                }}
              />
            </label>
          </div>
          <div className="taxi-picks show-taxi-picks" role="group" aria-label={m.taxiTo}>
            {stays.map((stay) => (
              <button
                key={stay.id}
                type="button"
                className="taxi-pick"
                aria-pressed={taxiTo?.kind === "stay" && taxiTo.id === stay.id}
                onClick={() => {
                  setTaxiTo({ kind: "stay", id: stay.id });
                  setTaxiToText("");
                }}
              >
                <BedIcon />
                {stay.name}
              </button>
            ))}
            {AIRPORTS.map((code) => (
              <button
                key={code}
                type="button"
                className="taxi-pick"
                aria-pressed={taxiTo?.kind === "airport" && taxiTo.code === code}
                onClick={() => {
                  setTaxiTo({ kind: "airport", code });
                  setTaxiToText("");
                }}
              >
                <PlaneIcon />
                {airports[code as keyof Messages["airports"]]}
              </button>
            ))}
          </div>
          {error?.where === "taxi" && (
            <p className="show-error" role="alert">
              {error.text}
            </p>
          )}
          <button type="button" className="button show-open" onClick={showTaxi} disabled={taxiPending} aria-busy={taxiPending}>
            <ShowIcon />
            {taxiPending ? m.writing : m.open}
          </button>
        </article>

        <ChipTile tone="food" icon={<FoodIcon />} title={m.foodTitle} sub={m.pickFood} openLabel={m.open} onOpen={() => setCard(chipCard("diet"))}>
          {DIET_KEYS.map((key) => (
            <button key={key} type="button" className="diet-chip" aria-pressed={diet.includes(key)} onClick={() => toggleDiet(key)}>
              {chipLabel(m.diet[key])}
            </button>
          ))}
        </ChipTile>
        <ChipTile tone="pharmacy" icon={<PillIcon />} title={m.pharmacyTitle} sub={m.pickSymptoms} openLabel={m.open} onOpen={() => setCard(chipCard("pharmacy"))}>
          {PHARMACY_KEYS.map((key) => (
            <button key={key} type="button" className="diet-chip" aria-pressed={symptoms.includes(key)} onClick={() => toggleSymptom(key)}>
              {chipLabel(m.symptoms[key])}
            </button>
          ))}
        </ChipTile>
        <ChipTile tone="shopping" icon={<BagIcon />} title={m.shoppingTitle} sub={m.pickQuestions} openLabel={m.open} onOpen={() => setCard(chipCard("shopping"))}>
          {SHOPPING_KEYS.map((key) => (
            <button key={key} type="button" className="diet-chip" aria-pressed={questions.includes(key)} onClick={() => toggleQuestion(key)}>
              {chipLabel(m.shopping[key])}
            </button>
          ))}
        </ChipTile>

        <form className="show-tile tone-write" onSubmit={showWrite}>
          <span className="show-tile-icon" aria-hidden="true">
            <PenIcon />
          </span>
          <div className="show-tile-text">
            <p className="show-tile-title">{m.writeTitle}</p>
            <p className="show-tile-sub">{m.writeSub}</p>
          </div>
          <textarea
            className="field show-write-input"
            rows={3}
            maxLength={300}
            required
            value={writeText}
            placeholder={m.writePlaceholder}
            aria-label={m.writeTitle}
            onChange={(event) => setWriteText(event.target.value)}
          />
          {error?.where === "write" && (
            <p className="show-error" role="alert">
              {error.text}
            </p>
          )}
          <button type="submit" className="button show-open" disabled={writePending} aria-busy={writePending}>
            {writePending ? <span className="show-spinner" aria-hidden="true" /> : <PenIcon />}
            {writePending ? m.writing : m.writeButton}
          </button>
        </form>
      </div>
      {card && <ShowOverlay card={card} closeLabel={m.close} onClose={() => setCard(null)} />}
    </div>
  );
}

function ChipTile({
  tone,
  icon,
  title,
  sub,
  openLabel,
  onOpen,
  children,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  openLabel: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className={`show-tile tone-${tone}`}>
      <span className="show-tile-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="show-tile-text">
        <p className="show-tile-title">{title}</p>
        <p className="show-tile-sub">{sub}</p>
      </div>
      <div className="diet-chips" role="group" aria-label={sub}>
        {children}
      </div>
      <button type="button" className="button show-open" onClick={onOpen}>
        <ShowIcon />
        {openLabel}
      </button>
    </article>
  );
}

const CARD_ICON: Record<CardIcon, React.ComponentType<{ className?: string }>> = {
  taxi: TaxiIcon,
  food: FoodIcon,
  pharmacy: PillIcon,
  shopping: BagIcon,
  write: PenIcon,
};

function ShowOverlay({ card, closeLabel, onClose }: { card: Card; closeLabel: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const Icon = CARD_ICON[card.icon];
  return (
    <div className="show-overlay" role="dialog" aria-modal="true" aria-label={card.title} onClick={onClose}>
      <section className={`show-card show-${card.icon}`} onClick={(event) => event.stopPropagation()}>
        <header className="show-card-head">
          <span className="show-card-icon" aria-hidden="true">
            <Icon />
          </span>
          <span>{card.title}</span>
          <button ref={closeRef} type="button" className="show-close" onClick={onClose} aria-label={closeLabel}>
            <XIcon />
          </button>
        </header>
        <div className="show-card-ko" lang="ko">
          {card.ko.map((line, i) => (
            <p key={i} className={i === 0 ? "show-lead" : "show-line"} style={{ "--i": i } as React.CSSProperties}>
              {line}
            </p>
          ))}
          {card.koFrom && (
            <p className="show-from" style={{ "--i": card.ko.length } as React.CSSProperties}>
              {card.koFrom}
            </p>
          )}
        </div>
        <div className="show-card-local">
          {card.local.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {card.warn && <p className="show-warn">{card.warn}</p>}
        </div>
      </section>
    </div>
  );
}

// 숙소 카드에 붙는 "택시 기사님께 보여주기" 버튼
export function ShowTaxiButton({ stayId, label }: { stayId: string; label: string }) {
  const detail: ShowEventDetail = { to: { kind: "stay", id: stayId } };
  return (
    <button type="button" className="stay-action" onClick={() => window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail }))}>
      <TaxiIcon />
      {label}
    </button>
  );
}
