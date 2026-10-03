"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { AIRPORT_KO, DIET_KEYS, DIET_KO, SHOW_KO, type DietKey } from "@/lib/show/phrases";
import { FoodIcon, PlaneIcon, ShowIcon, TaxiIcon, XIcon } from "./icons";
import { SignTitle } from "./SignTitle";

// 보여주기 카드 (PRD F-11, BACKLOG P2-1): 택시 기사님이나 식당 직원에게 화면을 그대로 보여준다.
// 한국어를 아주 크게, 이용자가 뜻을 알 수 있게 번역을 작게 함께 둔다. 카드는 3D로 뒤집히며 펼쳐진다.

export const SHOW_EVENT = "majungi:show";
const DIET_STORAGE = "majungi-diet";

type StayCard = { id: string; name: string; address?: string };
type Card = { icon: "taxi" | "plane" | "food"; title: string; ko: string[]; koSub?: string; local: string[]; warn?: string };

// "I'm vegetarian: no meat…" → 칩에는 콜론 앞만 쓴다
const chipLabel = (sentence: string) => sentence.split(/[:：]/)[0].replace(/[.。!！]$/, "").trim();

export function ShowCards({
  stays,
  airport,
  airportLocal,
  m,
}: {
  stays: StayCard[];
  airport?: string;
  airportLocal?: string;
  m: Messages["show"];
}) {
  const [card, setCard] = useState<Card | null>(null);
  const [diet, setDiet] = useState<DietKey[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DIET_STORAGE);
      if (saved) setDiet(JSON.parse(saved));
    } catch {
      // 무시
    }
  }, []);

  const taxiCard = useCallback(
    (stay: StayCard): Card => ({
      icon: "taxi",
      title: m.taxiTitle,
      ko: [SHOW_KO.taxi, stay.address ?? stay.name],
      koSub: stay.address ? stay.name : undefined,
      local: [m.taxiNote],
      warn: stay.address ? undefined : m.noAddress,
    }),
    [m],
  );

  // 숙소 카드의 "택시 기사님께 보여주기" 버튼이 이 이벤트로 카드를 연다
  useEffect(() => {
    const open = (event: Event) => {
      const stay = stays.find((candidate) => candidate.id === (event as CustomEvent<{ stayId: string }>).detail?.stayId);
      if (stay) setCard(taxiCard(stay));
    };
    window.addEventListener(SHOW_EVENT, open);
    return () => window.removeEventListener(SHOW_EVENT, open);
  }, [stays, taxiCard]);

  // 빠르게 여러 개를 눌러도 앞의 선택이 사라지지 않도록 이전 값에서 계산한다
  const toggleDiet = (key: DietKey) => {
    setDiet((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      try {
        localStorage.setItem(DIET_STORAGE, JSON.stringify(next));
      } catch {
        // 무시
      }
      return next;
    });
  };

  const airportKo = airport ? AIRPORT_KO[airport] : undefined;
  // 음식 카드 앞의 카드 수가 홀수면, 마지막 카드가 한 줄을 다 써서 빈칸이 생기지 않게 한다
  const lastWide = (stays.length + (airportKo ? 1 : 0)) % 2 === 1;
  const foodCard: Card = {
    icon: "food",
    title: m.foodTitle,
    ko: [SHOW_KO.food, ...diet.map((key) => DIET_KO[key]), SHOW_KO.thanks],
    local: [m.foodNote, ...diet.map((key) => m.diet[key])],
  };

  return (
    <div className="sign show-cards">
      <SignTitle as="h3" ko="보여주기 카드" text={m.title} />
      <p className="show-sub">{m.sub}</p>
      <div className="show-grid">
        {stays.length === 0 && <p className="show-empty">{m.noStay}</p>}
        {stays.map((stay, i) => (
          <article key={stay.id} className={lastWide && !airportKo && i === stays.length - 1 ? "show-tile tone-taxi is-wide" : "show-tile tone-taxi"}>
            <span className="show-tile-icon" aria-hidden="true">
              <TaxiIcon />
            </span>
            <div className="show-tile-text">
              <p className="show-tile-title">{m.taxiTitle}</p>
              <p className="show-tile-sub">{stay.name}</p>
            </div>
            <button type="button" className="button show-open" onClick={() => setCard(taxiCard(stay))}>
              <ShowIcon />
              {m.open}
            </button>
          </article>
        ))}
        {airportKo && (
          <article className={lastWide ? "show-tile tone-plane is-wide" : "show-tile tone-plane"}>
            <span className="show-tile-icon" aria-hidden="true">
              <PlaneIcon />
            </span>
            <div className="show-tile-text">
              <p className="show-tile-title">{m.airportTitle}</p>
              <p className="show-tile-sub">{airportLocal ?? airport}</p>
            </div>
            <button
              type="button"
              className="button show-open"
              onClick={() =>
                setCard({ icon: "plane", title: m.airportTitle, ko: [SHOW_KO.airport(airportKo)], local: [fmt(m.airportNote, { airport: airportLocal ?? airport ?? "" })] })
              }
            >
              <ShowIcon />
              {m.open}
            </button>
          </article>
        )}
        <article className="show-tile tone-food is-wide">
          <span className="show-tile-icon" aria-hidden="true">
            <FoodIcon />
          </span>
          <div className="show-tile-text">
            <p className="show-tile-title">{m.foodTitle}</p>
            <p className="show-tile-sub">{m.pickFood}</p>
          </div>
          <div className="diet-chips" role="group" aria-label={m.pickFood}>
            {DIET_KEYS.map((key) => (
              <button key={key} type="button" className="diet-chip" aria-pressed={diet.includes(key)} onClick={() => toggleDiet(key)}>
                {chipLabel(m.diet[key])}
              </button>
            ))}
          </div>
          <button type="button" className="button show-open" onClick={() => setCard(foodCard)}>
            <ShowIcon />
            {m.open}
          </button>
        </article>
      </div>
      {card && <ShowOverlay card={card} closeLabel={m.close} onClose={() => setCard(null)} />}
    </div>
  );
}

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

  const Icon = card.icon === "taxi" ? TaxiIcon : card.icon === "plane" ? PlaneIcon : FoodIcon;
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
            <p key={i} className={i === 0 ? "show-lead" : "show-line"}>
              {line}
            </p>
          ))}
          {card.koSub && <p className="show-ko-sub">{card.koSub}</p>}
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
  return (
    <button type="button" className="stay-action" onClick={() => window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: { stayId } }))}>
      <TaxiIcon />
      {label}
    </button>
  );
}
