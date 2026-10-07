"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { sendChat } from "@/app/actions";
import type { ItineraryItem } from "@/lib/board/types";
import type { LanguageCode } from "@/lib/i18n/languages";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { CATEGORY_ORDER, CITIES, type City, type SpotCategory } from "@/lib/map/cities";
import { CITY_POINTS, KOREA_OUTLINE, KOREA_VIEWBOX } from "@/lib/map/korea-outline";
import { SPOT_PHOTOS } from "@/lib/map/photos";
import { cityIdOf, routeLegs } from "@/lib/map/route";
import { ExecutionBadge } from "./ExecutionBadge";
import { CITY_THEMES, CityArt } from "./CityArt";
import { CategoryIcon, ChevronIcon, ExternalIcon } from "./icons";

const [, , VB_W, VB_H] = KOREA_VIEWBOX.split(" ").map(Number);
// 한 페이지에 관광지 5곳 + "마중이에게 물어보기" 카드 = 2열 3줄
const PAGE_SIZE = 5;
// 수도권·동해안은 거점이 붙어 있어 이름표 방향을 따로 정한다 (기본은 오른쪽)
// 이름표 자리: 브라우저에서 390px·1280px 화면의 실제 이름표 크기를 재어, 이름표·점끼리 겹치지 않게 고른 값 (기본은 오른쪽)
type LabelSide = "left" | "top" | "bottom" | "bottom-left" | "bottom-right" | "top-left" | "top-right";
const LABEL_SIDE: Record<string, LabelSide> = {
  seoul: "top",
  incheon: "left",
  sokcho: "top",
  jeonju: "left",
  daejeon: "left",
  andong: "top-right",
  yeosu: "bottom",
  daegu: "bottom-left",
  gwangju: "bottom-left",
};
// 구글 지도 검색 링크 (Maps URLs, API 키 없이 쓰는 공식 링크 형식). 같은 이름의 다른 장소를 피하려고 도시 이름을 붙인다.
function mapsUrl(cityKo: string, spotKo: string): string {
  const query = spotKo.startsWith(cityKo) ? spotKo : `${cityKo} ${spotKo}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// 바다 이름은 지도 장식이라 한국어로만 적는다
const SEAS = [
  { name: "서해", x: 34, y: 200 },
  { name: "동해", x: 300, y: 160 },
  { name: "남해", x: 236, y: 330 },
];

type Props = { itinerary: ItineraryItem[]; arrivalAirport?: string; language: LanguageCode; m: Messages };

// 여행지 둘러보기: 대한민국 지도 위 거점을 누르면 그 도시의 명소·음식·체험·쇼핑·야경이 나온다.
export function KoreaMap({ itinerary, arrivalAirport, language, m }: Props) {
  const routeIds = new Set(itinerary.map((item) => cityIdOf(item.city)).filter(Boolean));
  // 처음에는 내 일정의 첫 도시(없으면 서울)를 펼쳐 두어 빈 화면이 없게 한다
  const [selected, setSelected] = useState<string>(() => [...routeIds][0] ?? "seoul");
  const [category, setCategory] = useState<SpotCategory | "all">("all");
  const [page, setPage] = useState(0);
  const [pending, startTransition] = useTransition();
  const legs = routeLegs(itinerary, arrivalAirport);
  const city = CITIES.find((candidate) => candidate.id === selected);

  const choose = (id: string) => {
    setSelected(id);
    setCategory("all");
    setPage(0);
  };
  const pickCategory = (cat: SpotCategory | "all") => {
    setCategory(cat);
    setPage(0);
  };

  const ask = () => {
    if (!city) return;
    document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
    startTransition(async () => {
      await sendChat(fmt(m.map.askPrompt, { city: city.name[language] }));
    });
  };

  const categories = city ? CATEGORY_ORDER.filter((cat) => city.spots.some((spot) => spot.category === cat)) : [];
  const filtered = city ? city.spots.filter((spot) => category === "all" || spot.category === category) : [];
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const spots = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const goTo = (next: number) => {
    setPage(next);
    document.getElementById("spot-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="explore">
      <h4 className="explore-title">
        <span lang="ko">여행지 둘러보기</span>
        {m.map.title !== "여행지 둘러보기" && <span>{m.map.title}</span>}
      </h4>
      <p className="explore-hint">{m.map.pick}</p>
      <div className="explore-top">
        <div className="explore-map">
          <svg viewBox={KOREA_VIEWBOX} aria-hidden="true">
            <defs>
              <linearGradient id="kmap-land" x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0" stopColor="#dcebd2" />
                <stop offset="0.55" stopColor="#eef0dc" />
                <stop offset="1" stopColor="#f6ecd6" />
              </linearGradient>
            </defs>
            {SEAS.map((sea) => (
              <text key={sea.name} className="map-sea" x={sea.x} y={sea.y} textAnchor="middle">
                {sea.name}
              </text>
            ))}
            <path className="map-coast" d={KOREA_OUTLINE} />
            <path className="map-land" d={KOREA_OUTLINE} fill="url(#kmap-land)" />
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
              LABEL_SIDE[item.id] ? `label-${LABEL_SIDE[item.id]}` : "",
            ].join(" ");
            return (
              <button
                key={item.id}
                type="button"
                className={classes}
                style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%`, "--pin": CITY_THEMES[item.id]?.accent } as CSSProperties}
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
        {city && (
          <div className="explore-aside" key={city.id} aria-live="polite">
            <header
              className={CITY_THEMES[city.id]?.dark ? "city-head is-dark" : "city-head"}
              style={{ "--city-from": CITY_THEMES[city.id]?.from, "--city-to": CITY_THEMES[city.id]?.to } as CSSProperties}
            >
              <CityArt id={city.id} className="city-art" />
              <div className="city-head-text">
                <h5 className="city-name">
                  <span lang="ko">{city.name.ko}</span>
                  {language !== "ko" && <span>{city.name[language]}</span>}
                </h5>
                <p className="city-tagline">{city.tagline[language]}</p>
                <div className="city-tags">
                  <ExecutionBadge level="안내" m={m} />
                  {routeIds.has(city.id) && <span className="city-route">{m.map.inRoute}</span>}
                </div>
              </div>
            </header>
            <PandaGuide city={city} language={language} m={m} />
            <div className="city-cats" role="group" aria-label={m.map.title}>
              {(["all", ...categories] as const).map((cat) => (
                <button key={cat} type="button" className="cat-chip" aria-pressed={category === cat} onClick={() => pickCategory(cat)}>
                  {cat !== "all" && <CategoryIcon category={cat} className="cat-icon" />}
                  {cat === "all" ? m.map.all : m.map[cat]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {city && (
        <ul className="spot-grid" id="spot-grid" key={`${city.id}-${category}-${current}`}>
          {spots.map((spot) => {
            const photo = SPOT_PHOTOS[`${city.id}/${spot.name.en}`];
            return (
              <li key={spot.name.en} className={`spot cat-${spot.category}`}>
                {photo ? (
                  <span className="spot-tile spot-photo" aria-hidden="true">
                    {/* 240px로 미리 자른 작은 사진이라 next/image 최적화 없이 그대로 쓴다 */}
                    <img src={photo.src} alt="" width={120} height={120} loading="lazy" decoding="async" />
                  </span>
                ) : (
                  <span className="spot-tile" aria-hidden="true">
                    <CategoryIcon category={spot.category} />
                  </span>
                )}
                <div className="spot-text">
                  <span className="spot-cat">
                    <CategoryIcon category={spot.category} />
                    {m.map[spot.category]}
                  </span>
                  <p className="spot-name">
                    <a className="spot-link" href={mapsUrl(city.name.ko, spot.name.ko)} target="_blank" rel="noopener noreferrer">
                      <span lang="ko">{spot.name.ko}</span>
                      {language !== "ko" && <span className="spot-en">{spot.name.en}</span>}
                    </a>
                  </p>
                  <p className="spot-desc">{spot.desc[language]}</p>
                  <span className="spot-maps" aria-hidden="true">
                    {m.map.openMap}
                    <ExternalIcon />
                  </span>
                  {photo && (
                    <p className="spot-credit">
                      {m.map.photo}:{" "}
                      <a href={photo.page} target="_blank" rel="noopener noreferrer">
                        {photo.artist}
                      </a>
                      {" · "}
                      {photo.licenseUrl ? (
                        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer license">
                          {photo.license}
                        </a>
                      ) : (
                        photo.license
                      )}
                      {" · Wikimedia Commons"}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          <li className="spot-ask">
            <img src="/mascot/majung-panda.png" alt="" width={72} height={78} />
            <button type="button" className="button" onClick={ask} disabled={pending}>
              {pending ? m.chat.working : fmt(m.map.ask, { city: city.name[language] })}
            </button>
          </li>
        </ul>
      )}
      {city && pages > 1 && (
        <nav className="pager" aria-label={m.map.title}>
          <button type="button" className="pager-arrow" onClick={() => goTo(current - 1)} disabled={current === 0} aria-label={m.map.prevPage}>
            <ChevronIcon direction="left" />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              className="pager-page"
              aria-current={i === current ? "page" : undefined}
              aria-label={fmt(m.map.page, { n: i + 1 })}
              onClick={() => goTo(i)}
            >
              {i + 1}
            </button>
          ))}
          <button type="button" className="pager-arrow" onClick={() => goTo(current + 1)} disabled={current === pages - 1} aria-label={m.map.nextPage}>
            <ChevronIcon direction="right" />
          </button>
        </nav>
      )}
    </div>
  );
}

// 판다 마스코트가 지도 아래에서 고른 도시를 소개한다. 도시를 바꿀 때마다 통통 튀며 말한다.
function PandaGuide({ city, language, m }: { city: City; language: LanguageCode; m: Messages }) {
  const pick = city.spots.find((spot) => spot.category === "experience") ?? city.spots[0];
  const photo = SPOT_PHOTOS[`${city.id}/${pick.name.en}`];
  return (
    <div className="guide" key={city.id}>
      <img className="guide-panda" src="/mascot/majung-panda.png" alt="" width={240} height={261} />
      <div className="guide-say">
        <p className="guide-ko" lang="ko">
          여기는 {city.name.ko}! 이건 꼭 경험해 보세요
        </p>
        {language !== "ko" && <p className="guide-local">{fmt(m.map.pandaSay, { city: city.name[language] })}</p>}
        <a className="guide-pick" href={mapsUrl(city.name.ko, pick.name.ko)} target="_blank" rel="noopener noreferrer">
          {photo ? (
            <img src={photo.src} alt="" width={44} height={44} />
          ) : (
            <span className="guide-pick-icon">
              <CategoryIcon category={pick.category} />
            </span>
          )}
          <span className="guide-pick-text">
            <span lang="ko">{pick.name.ko}</span>
            <span className="guide-pick-desc">{pick.desc[language]}</span>
          </span>
          <ExternalIcon className="guide-pick-go" />
        </a>
      </div>
    </div>
  );
}
