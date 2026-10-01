"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { sendChat } from "@/app/actions";
import type { ItineraryItem } from "@/lib/board/types";
import type { LanguageCode } from "@/lib/i18n/languages";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CATEGORY_ORDER, CITIES, type SpotCategory } from "@/lib/map/cities";
import { CITY_POINTS, KOREA_OUTLINE, KOREA_VIEWBOX } from "@/lib/map/korea-outline";
import { cityIdOf, routeLegs } from "@/lib/map/route";
import { ExecutionBadge } from "./ExecutionBadge";

const [, , VB_W, VB_H] = KOREA_VIEWBOX.split(" ").map(Number);
// 서울·인천은 붙어 있어 인천 이름표를 왼쪽에 둔다
const LABEL_LEFT = new Set(["incheon"]);

type Props = { itinerary: ItineraryItem[]; arrivalAirport?: string; language: LanguageCode; m: Messages };

// 여행지 둘러보기: 대한민국 지도 위 거점을 누르면 그 도시의 명소·음식·체험·쇼핑·야경이 나온다.
export function KoreaMap({ itinerary, arrivalAirport, language, m }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<SpotCategory | "all">("all");
  const [pending, startTransition] = useTransition();
  const routeIds = new Set(itinerary.map((item) => cityIdOf(item.city)).filter(Boolean));
  const legs = routeLegs(itinerary, arrivalAirport);
  const city = CITIES.find((candidate) => candidate.id === selected);

  const choose = (id: string) => {
    setSelected(id === selected ? null : id);
    setCategory("all");
  };

  const ask = () => {
    if (!city) return;
    document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
    startTransition(async () => {
      await sendChat(fmt(m.map.askPrompt, { city: city.name[language] }));
    });
  };

  const categories = city ? CATEGORY_ORDER.filter((cat) => city.spots.some((spot) => spot.category === cat)) : [];
  const spots = city ? city.spots.filter((spot) => category === "all" || spot.category === category) : [];

  return (
    <div className="explore">
      <h4 className="explore-title">
        <span lang="ko">여행지 둘러보기</span>
        {m.map.title !== "여행지 둘러보기" && <span>{m.map.title}</span>}
      </h4>
      <div className="explore-body">
        <div className="explore-map">
          <svg viewBox={KOREA_VIEWBOX} aria-hidden="true">
            <path className="map-land" d={KOREA_OUTLINE} />
            {legs.map((leg) => {
              const [x1, y1] = CITY_POINTS[leg.from];
              const [x2, y2] = CITY_POINTS[leg.to];
              return (
                <line key={`${leg.from}-${leg.to}`} className={leg.arranged ? "map-leg" : "map-leg is-unarranged"} x1={x1} y1={y1} x2={x2} y2={y2} />
              );
            })}
          </svg>
          {CITIES.map((item) => {
            const [x, y] = CITY_POINTS[item.id];
            const classes = [
              "map-pin",
              routeIds.has(item.id) ? "is-route" : "",
              selected === item.id ? "is-selected" : "",
              LABEL_LEFT.has(item.id) ? "label-left" : "",
            ].join(" ");
            return (
              <button
                key={item.id}
                type="button"
                className={classes}
                style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` } as CSSProperties}
                aria-pressed={selected === item.id}
                onClick={() => choose(item.id)}
              >
                <span className="map-dot" aria-hidden="true" />
                <span className="map-label">
                  <span lang="ko">{item.name.ko}</span>
                  {language !== "ko" && <span>{item.name[language]}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="explore-panel" aria-live="polite">
          {!city ? (
            <p className="explore-hint">{m.map.pick}</p>
          ) : (
            <article key={city.id} className="city-card">
              <header className="city-head">
                <div>
                  <h5 className="city-name">
                    <span lang="ko">{city.name.ko}</span>
                    {language !== "ko" && <span>{city.name[language]}</span>}
                  </h5>
                  <p className="city-tagline">{city.tagline[language]}</p>
                </div>
                <ExecutionBadge level="안내" m={m} />
              </header>
              {routeIds.has(city.id) && <p className="city-route">{m.map.inRoute}</p>}
              <div className="city-cats" role="group" aria-label={m.map.title}>
                {(["all", ...categories] as const).map((cat) => (
                  <button key={cat} type="button" className="cat-chip" aria-pressed={category === cat} onClick={() => setCategory(cat)}>
                    {cat === "all" ? m.map.all : m.map[cat]}
                  </button>
                ))}
              </div>
              <ul className="spot-list">
                {spots.map((spot) => (
                  <li key={spot.name.en} className="spot">
                    <span className="spot-cat">{m.map[spot.category]}</span>
                    <p className="spot-name">
                      <span lang="ko">{spot.name.ko}</span>
                      {language !== "ko" && <span className="spot-en">{spot.name.en}</span>}
                    </p>
                    <p className="spot-desc">{spot.desc[language]}</p>
                  </li>
                ))}
              </ul>
              <p className="city-note">{m.map.note}</p>
              <button type="button" className="button" onClick={ask} disabled={pending}>
                {pending ? m.chat.working : fmt(m.map.ask, { city: city.name[language] })}
              </button>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
