---
name: 마중 Majung
description: A travel agent for first-time visitors to Korea, drawn as Seoul Metro wayfinding.
colors:
  ground: "#e8ebee"
  ground-deep: "#dce0e4"
  sign: "#ffffff"
  signbar: "#23272d"
  signbar-2: "#31363d"
  signbar-rule: "#4a5058"
  signbar-hover: "#3b4149"
  ink: "#15181c"
  ink-2: "#4a5058"
  ink-3: "#626973"
  on-dark: "#ffffff"
  on-dark-2: "#b8bec6"
  rule: "#d4d9de"
  rule-strong: "#aab1ba"
  act: "#00a84d"
  act-deep: "#00813b"
  act-hover: "#006b31"
  act-tint: "#e2f3e9"
  prep: "#ef7c1c"
  prep-deep: "#a5500a"
  prep-tint: "#fdeedf"
  info: "#00a5de"
  info-deep: "#006c94"
  info-tint: "#e0f1f9"
  arex: "#0065b3"
  arex-deep: "#004f8c"
  exit: "#ffcd00"
  alert: "#c0161c"
  alert-tint: "#fbe5e5"
  board: "#0d1014"
  board-rule: "#2a3038"
  led: "#f1f4f7"
typography:
  display:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "19px"
    fontWeight: 800
    lineHeight: 1.4
  title:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  board-title:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  body-korean-draft:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "Pretendard, -apple-system, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  exit-code:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 700
rounded:
  tile: "3px"
  sign: "6px"
  panel: "10px"
  pill: "999px"
  roundel: "50%"
spacing:
  xs: "8px"
  sm: "14px"
  md: "20px"
  lg: "28px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signbar}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sign}"
    padding: "8px 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.signbar-hover}"
  button-quiet:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "8px 14px"
    height: "42px"
  button-quiet-hover:
    backgroundColor: "{colors.ground}"
  button-approve:
    backgroundColor: "{colors.act-deep}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.sign}"
    padding: "12px 22px"
    height: "52px"
    width: "100%"
  button-approve-hover:
    backgroundColor: "{colors.act-hover}"
  field:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "8px 12px"
    height: "42px"
  sign-panel:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "0 20px 20px"
  sign-panel-bar:
    backgroundColor: "{colors.signbar}"
    textColor: "{colors.on-dark}"
    padding: "12px 20px"
  line-pill-act:
    backgroundColor: "{colors.act-deep}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "3px 11px 3px 4px"
    height: "26px"
  line-pill-prep:
    backgroundColor: "{colors.prep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 11px 3px 4px"
    height: "26px"
  line-pill-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 11px 3px 4px"
    height: "26px"
  exit-tile:
    backgroundColor: "{colors.exit}"
    textColor: "{colors.ink}"
    typography: "{typography.exit-code}"
    rounded: "{rounded.tile}"
    padding: "2px 7px"
  code-roundel:
    backgroundColor: "{colors.arex-deep}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.roundel}"
    size: "34px"
  lang-button:
    backgroundColor: "{colors.signbar-2}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "6px 12px 6px 10px"
    height: "40px"
  lang-option-selected:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "9px 11px"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sign}"
    padding: "4px 10px"
    height: "34px"
  button-ghost-hover:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  arrival-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.led}"
    typography: "{typography.board-title}"
    rounded: "{rounded.sign}"
    padding: "16px 20px"
  toast:
    backgroundColor: "{colors.signbar}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "10px 18px 10px 10px"
  reduction-chip:
    backgroundColor: "{colors.arex-deep}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  mascot-avatar:
    backgroundColor: "{colors.sign}"
    rounded: "{rounded.roundel}"
    size: "40px"
---

# Design System: 마중이 Majungi

## Overview

**Creative North Star: "From the Arrivals Hall to the City"**

Majung reads like Korea's airport and metro wayfinding set under a travel sky. The page background is a sky that warms toward sand as you scroll (clear blue top-left, a sunset glow top-right), carrying white sign panels, each headed by an airline-navy signage bar. Every request is a line ridden station by station to its end, the trip itself is drawn as a line with cities as stations, and every sign carries Korean and the visitor's language together, Korean bold on top, translation beneath.

Line colors are codes, not decoration. Line 2 green means 대행 (We send it), Line 3 orange means 준비 (Prep), Line 4 sky means 안내 (Info), AREX deep blue is Majung the agent and the trip line, and the yellow exit-number tile marks a tool call that actually ran. Each color appears at full strength where it codes something and nowhere else. Density is calm and legible enough for a phone at 1:30 AM and a classroom projector; hierarchy comes from scale and weight contrast within a single family, not from color or ornament.

The system refuses the default travel-app dashboard of rounded white cards with a floating chat bubble: panels are square-shouldered signs, the chat is a fixed information desk, and the one irreversible action (approving a send) sits alone on a full-width green bar.

**Key Characteristics:**
- Sky-to-sand page background, white sign panels (10px radius, soft navy-tinted shadow), airline-navy signage bar on every panel title; big section titles (여행 보드, 요청) carry a 52px AREX gradient icon tile (suitcase, envelope).
- Bilingual stacks everywhere: Korean (800 weight) first, user language (500 weight, ink-2) beside or beneath.
- Line color as code at full strength; never decorative, never tinted into backgrounds except selection and hover states of the AREX/Info family.
- Roundels (station-number circles) for airports, the agent, and the brand.
- An arrival board (전광판) opens the main column: a dark LED screen that is the one non-sign material in the world.
- Signature motion is mechanical, like the metro: the train marker slides along a route strip, changed board text turns over like split-flap, approving closes screen doors over the sign.
- Majung the mascot (supplied 3D artwork) staffs the information desk; the artwork is an asset, never a source of CSS color.

## Colors

A travel signage palette (sky, sand, white, airline navy) with five transit codes held at full saturation.

### Primary
- **AREX Deep Blue** (arex): Majung's own line. The header's single bottom rule (5px), the information desk's title underline (4px), trip-route track and station rings, the working indicator, the focus outline, the selected language border.
- **AREX Night Blue** (arex-deep): solid fills that must carry white text: airport code roundels, the large airport stations on the trip line, the report's reduction chip, field focus border, caret and accent color. Also the "after" value text on the report.

AREX additionally codes everything that is Majung acting: the 2px ring on the mascot avatar, the spark burst on a new reply, the "다음" row dot on the arrival board, and the "after" bars on the report.

### Secondary (execution lines)
- **Line 2 Green** (act / act-deep): 대행 We send it. The pill fill (act-deep, white text), the focused request's top band (act, 6px), passed stations on a 대행 route strip, and the approve bar (act-deep, hover act-hover).
- **Line 3 Orange** (prep / prep-deep): 준비 Prep. Pill fill with ink text; prep-deep for text that must read on white (missing-transport segment labels, "translated into" notes, conditional outcomes).
- **Line 4 Sky** (info / info-deep): 안내 Info. Pill fill with ink text; info-deep for text on white; info-tint as the selected/hover wash in the language panel and example prompts.

### Tertiary
- **Exit Yellow** (exit): exit-number tiles above an agent reply, one per tool call that ran. Ink text, never white.
- **Signal Red** (alert / alert-tint): errors only: alert boxes, failed tool tiles, error replies, declined outcomes.

### Neutral
- **Sky / Sand** (sky `#c9e2f7`, sand `#f7f1e6`): the page background gradient (sky → ground by 520px → sand by 1800px) plus two soft radial glows at the top (blue left, `rgb(255 200 150)` sunset right). Never used inside sign panels as a status color.
- **Ground** (ground `#edf2f7`, ground-deep): the middle of the page gradient and recessed areas inside signs (editor forms, the back-translation panel, agent speech, pills).
- **Sign White** (sign): every sign panel, field, quiet button.
- **Airline Navy** (signbar `#17335c`, signbar-2 `#22436f`, signbar-rule `#3e5e8a`): header (a 100° navy gradient `#10284b` → `#1f4f86` with a faint white sheen), panel title bars, station-sign bar, primary buttons, the visitor's own speech. signbar-2 and signbar-rule are the raised control and hairline inside the dark header; signbar-hover is the hover tone for dark controls.
- **Ink** (ink, ink-2, ink-3): primary text; secondary text and translations; placeholders and unreached stations.
- **On-dark** (on-dark, on-dark-2): text on charcoal; on-dark-2 for the translation line inside a dark bar.
- **Rules** (rule, rule-strong): hairlines between sign rows and panel borders; quiet-button and field strokes, dashed unarranged track. rule-strong is also the neutral "before" bar on the report.

### Board Material
- **LED Amber** (led-amber `#ffb547`): the board's "✈ 도착 ARRIVALS" label, the live clock dot and the countdown digits. Board-only, like a real flight information display; never used on signs.
- **Board Tile** (board-tile `#2c3749` / board-tile-2 `#222b3b`): the two halves of a split-flap tile.
- **Board Black** (board): the arrival board's screen. A material, not a line color.
- **Board Rule** (board-rule): the board's 1px frame and the hairlines between its top bar and rows.
- **LED White** (led): primary text and the live-clock dot on the board; secondary board text uses on-dark-2.

### Named Rules
**The Line Code Rule.** A line color appears only where it codes its meaning: green for 대행, orange for 준비, sky for 안내, AREX for the agent and the trip, yellow for a tool call that ran. No line color is used as generic accent or decoration.

**The AREX Is Not Line 4 Rule.** AREX deep blue and Line 4 sky are distinct and must stay distinct: the agent is never drawn in sky, and Info is never drawn in AREX blue.

**The Board Is Material Rule.** board, board-rule and led exist only for the arrival board's screen. They are not a dark theme and never reach sign panels, buttons or the desk.

**The Honest Exit Rule.** Yellow exit tiles appear only for tool calls that actually executed; a failed call shows in alert-tint, and no tile is drawn for an intended or hypothetical call.

## Typography

**Display Font:** Pretendard (variable, 45-920), with -apple-system, Apple SD Gothic Neo, Noto Sans KR
**Body Font:** Pretendard, with per-language fallbacks: Hiragino Sans / Noto Sans JP for ja, PingFang SC / TC for zh, Noto Sans Thai for th
**Label/Mono Font:** ui-monospace, used only inside exit tiles

**Character:** One sans throughout, like transit signage: Korean set heavy and tight, the visitor's language lighter and grayer beside it. Hierarchy is scale and weight, never a second display face.

### Hierarchy
- **Display** (800, 32px, 1.2): section sign titles (여행 보드, 요청), Korean only, with the user-language line at 14px/500 beneath.
- **Headline** (800, 19px, 1.4): the Korean subject on a station-name sign and the information desk title.
- **Board** (800, 26px, 1.25; 21px at ≤640px): the "이번" headline on the arrival board, the largest type inside any panel. Board secondary row text 17px/700, countdown 24px/800 (19px narrow), clock 17px/800 with 0.04em tracking, row labels Korean 15px/800 over user language 12px.
- **Title** (800, 17px, 1.2): panel title on a signage bar, user language 13px/500 inline beside it. Request titles run 18px/800.
- **Body** (400, 15px, 1.55): default text, chat speech (1.6). Korean draft body runs 17px/1.8, back-translation 15px/1.65, both capped at 68ch.
- **Label** (600, 12-13px): form labels, route-strip station names, trip meta, badge labels, ghost buttons, the board legend. Not uppercase.
- **Report figures**: count-up values 15px/800 (ink-3 before, arex-deep after), reduction chip 15px/800, "after" table cells 19px/800 arex-deep.

### Named Rules
**The Bilingual Stack Rule.** Every sign title is Korean first at 800 weight, the user's language second at 500 weight in ink-2 (on-dark-2 on charcoal). On the Korean UI the second line is omitted, never duplicated.

**The Tabular Rule.** Times, dates, booking numbers and flight data use tabular figures.

**The Keep-All Rule.** Korean text never breaks mid-word (word-break: keep-all); Thai runs at line-height 1.7.

## Layout

A centered platform of 1240px max with 16px gutters: a fluid main column and a 380px information desk on the right, 28px apart, 28px top and 72px bottom padding. Main-column sections stack 40px apart; panels inside a section stack 14px apart. Sign panels pad 20px (16px at ≤560px).

The main column opens with the arrival board, its "Line guide" legend of execution pills directly beneath (the header no longer carries a legend). The report page reuses the platform at 960px max, single column.

The desk is sticky at 16px from the top and fills the viewport height on wide screens. At ≤1040px the grid collapses to one column, the desk drops below and turns static, and an "Ask Majung" pill appears in the header to jump to it. At ≤640px board rows tighten to a 10px dot and 48px label column with the time under the title, report bar rows stack label over bars, and the trip line turns vertical: stations stack with a 4px AREX track down the left at 18px, airports as 40px roundels, unarranged segments dashed. At ≤560px inline forms stack, the tagline and the language name hide (flag only), and the report's per-request table turns into two-column stacked rows with each value labelled.

## Elevation & Depth

Mostly flat, signage-like. Sign panels sit on the concrete ground with a hairline border and a barely-there shadow; depth comes from the charcoal bars and the ground/white contrast, not from lift. Real lift is reserved for things that float: the language popover, the toast, and the request awaiting approval. The arrival board has no shadow; it is a flat screen framed by a 1px board-rule line.

### Shadow Vocabulary
- **Sign** (`0 1px 2px rgb(21 24 28 / 0.06), 0 1px 1px rgb(21 24 28 / 0.04)`): every resting sign panel, request, and the desk.
- **Lift** (`0 14px 36px rgb(21 24 28 / 0.18), 0 2px 6px rgb(21 24 28 / 0.08)`): the language popover and the toast.
- **Focus request** (`0 10px 28px rgb(21 24 28 / 0.12)`): the request awaiting approval.
- **Train** (`0 2px 6px rgb(21 24 28 / 0.25)`): the train marker on a route strip.

### Named Rules
**The Flat Platform Rule.** Signs rest flat; only floating or awaiting-action surfaces lift.

## Shapes

Square-shouldered signs with a small 6px radius on panels, fields, buttons and the arrival board; 10px only for the popover and chat speech bodies; the desk greeting bubble is 6px with its bottom-left corner square and a square-cut tail; 3px for exit tiles and the demo tag; full pills for execution badges, the language button, the toast and the reduction chip; perfect circles for every roundel and station dot. Charcoal title bars bleed edge to edge inside their panel (no inset, panel clips them). Track is a 4px bar; unarranged track is a dashed 8px-on/6px-off repeat. Ring roundels (the brand, desk example markers, trip stations) use a white or charcoal gap ring before the colored ring; board dots use a board-black gap ring. Report bar tracks are 26px tall with a 4px radius.

## Components

### Buttons
Plain signage controls, bold text, no icons except the approve arrow.
- **Shape:** gently squared (6px), 42px minimum height.
- **Primary:** charcoal fill, white text, 14px/700, 8px 18px. Hover signbar-hover.
- **Quiet:** white with rule-strong stroke, ink text, 14px/600. Hover: ground fill, ink-3 stroke. Also used as the summary of collapsible editors.
- **Approve:** the lone full-width bar, act-deep, white 16px/700, 52px tall, trailing arrow. Hover act-hover.
- **Small:** 32px, 4px 10px, 13px (retranslate).
- **Ghost:** borderless, 34px, 4px 10px, ink-2 13px/600 with a leading authored 14px stroke SVG (pencil for Edit, plus for Add). Hover or open: ground fill, ink text. Used for in-panel Edit / Add toggles.
- **States:** active nudges down 1px; disabled at 55% opacity with progress cursor. Transitions 140ms on the ease-out curve.

### Chips
- **Execution line pill:** full pill in the line color with a white inner pill carrying the Korean term (안내 / 준비 / 대행) in the deep line color, then the translated label. Korean term is always present; there is no 확정 pill.
- **Exit tile:** yellow, mono 11px/700, 3px radius, one per executed tool call.

### Cards / Containers
- **Sign panel:** white, 1px rule border, 6px radius, sign shadow, 20px padding, opening with a full-bleed charcoal title bar (Korean on-dark 17px/800, user language on-dark-2).
- **Request:** a sign panel holding the request head (line pill, bilingual title, target), its route strip, and, when pending, a station-name sign that bleeds to the panel's edges. A pending request gains a 6px act top band and the focus-request shadow.
- **Empty note:** dashed rule-strong border, 6px, ink-2.

### Inputs / Fields
- **Style:** white, 1px rule-strong stroke, 6px, 42px, 15px/500. Hover stroke ink-3.
- **Focus:** stroke arex-deep plus a 3px AREX ring at 28% (`rgb(0 101 179 / 0.28)`). Global focus elsewhere is a 3px AREX outline at 2px offset.
- **Error:** alert box, alert-tint fill, alert text, 6px.
- **Date / date-time:** never the native picker (it follows the OS language). A field-styled button shows the date in the user's language via Intl (year, short month, day, short weekday; Thai shows the Buddhist year) with a 16px calendar glyph in ink-3. It opens a 280px white popover (rule-strong stroke, 6px, the only soft drop shadow besides signs) with ‹ › round nav buttons, the localized month title 15px/800, narrow weekday heads 11px ink-3, and 34px round day cells: today ringed AREX, selected filled arex-deep. Weeks start Monday for es and vi, Sunday otherwise. Time is two 24-hour selects (hour, 5-minute steps). Forms still receive `YYYY-MM-DD` / `YYYY-MM-DDTHH:MM`.

### Navigation
- **Header (signage bar):** charcoal, single 5px AREX bottom rule. Brand roundel (44px, the mascot head on sign white inside a charcoal gap and green ring), 마중 at 21px/800 with "Majung" 13px on-dark-2, tagline 13px. Right: the "Ask Majung" jump pill (≤1040px only), then the language pill (signbar-2, signbar-rule stroke, flag + native name + chevron). The execution legend now lives under the arrival board.
- **Language panel:** popover under the header, white, 10px, lift shadow, 3-column grid (2 at ≤520px) of 56px options; selected option has a 2px AREX border and info-tint wash with an arex-deep check. Fades and drops 6px in over 160ms.

### Arrival Board (signature)
The 전광판 at the top of the main column. A flat board-black screen, 6px radius, 1px board-rule frame, no shadow. Top bar: a "welcome" ticker cycling through the nine languages on the left (15px/700, on-dark-2, every 3.2s, paused when the tab is hidden), and the KST clock on the right with a pulsing LED dot. Below, "이번 / 다음" arrival rows separated by board-rule hairlines: a 14px dot in the row's line color (led when the row has no line, AREX for the arrival countdown), a 64px bilingual label column, title and detail, and a right-aligned tabular time column. The execution-pill legend sits under the board on the ground. No kicker, no stat counters.

### Flap Text
Board text is split per grapheme (Hangul, kana, Han and Thai included) and grouped per word so lines never break mid-word. Characters turn down like split-flap (440ms ease-out, 22ms stagger, capped at 40) only when the text changes after first render, or while a language switch is in progress. Never on plain page load. During a language switch (`html[data-lang-swap]`) sign labels, buttons, route labels and notes flip in over 560ms.

### Station-Name Sign (signature)
The approval surface. A charcoal bar states what will be sent and to whom; below, the Korean subject (19px/800) and body (17px/1.8) on white; then the back-translation on concrete ground; then an actions area with the quiet "Request changes" control and the not-sent note on one row and the full-width approve bar alone beneath.

On approve, two charcoal screen doors (signbar with a 1px inset signbar-rule line) slide shut over the sign in 480ms ease-out while the real send runs; where they meet, a 3px Line 2 green seam is drawn by each door's inner pseudo-element, never as a side border. "Sending…" (18px/800, on-dark) fades in on the right door. Completion is announced by the toast.

### Toast
Charcoal pill, bottom center 24px above the edge, lift shadow, 15px/600 on-dark, led by a 28px act-deep disc with a white check. Rises 16px in over 360ms and dismisses itself after 4.5s; announced via a polite live region.

### Route Strip (signature)
Five stations (draft, awaiting approval, sent, awaiting reply, outcome) on a 4px track in the request's line color. Passed stations fill solid, the current label goes ink 700, outcome labels take their meaning color. A pill-shaped train marker (30×18, white 3px ring) slides to the current station over 520ms ease-out; reduced motion jumps.

### Trip Line
Cities as white-centered AREX ring stations on a 4px AREX track between airport roundels (40px arex-deep, white code). A segment with no transport arranged is dashed rule-strong with a prep-deep label. Horizontal and scrollable on wide screens, vertical at ≤640px.

### Korea Map (Explore)
Under the trip line, a "여행지 둘러보기" block. The map plate is material, not code: sea is a pale blue gradient (`#e4f1fa` → `#c4e0f3`) with a soft highlight, land is a Natural Earth outline filled top-to-bottom green → cream → sand (`#dcebd2` → `#f6ecd6`) over a white coast halo, with a 0.8 stroke `#7fa7c4` and a short offset drop shadow. Korean-only sea names (서해·동해·남해) sit in `#6d9fc4` with wide tracking as decoration. Eleven city stations (Seoul, Incheon, Suwon, Sokcho, Gangneung, Andong, Jeonju, Gyeongju, Busan, Yeosu, Jeju) are real buttons: 14px white dot with a 3px ink-3 ring, AREX ring when on the itinerary, filled arex-deep when selected with a repeating AREX ripple. Labels are small white plates with a soft shadow, Korean 800 over the localized name, placed right by default and left/top/bottom where stations crowd (Incheon left, Seoul and Sokcho top, Suwon bottom). Itinerary legs are AREX, dashed ink-3 where no transport is arranged. The map is the larger column (1.2fr beside a ≥280px panel; stacked up to 440px wide at ≤760px), and each station dot is filled with its city accent inside a white ring (AREX outer ring when on the itinerary). The city panel opens with a postcard header: each city has its own two-stop gradient and an authored 120-unit flat illustration at the bottom right (`app/components/CityArt.tsx`) — Jeju a tangerine over Hallasan, Seoul N Seoul Tower and lit windows, Busan Gwangan Bridge and waves, Gyeongju Cheomseongdae and tumuli, Jeonju a hanok roof, Suwon Janganmun gate, Sokcho granite peaks, Gangneung coffee and sunrise, Andong a Hahoe mask, Incheon a cable-stayed bridge, Yeosu night sea with a cable car on a dark indigo-to-violet card with white text. The art fades in from below once (700ms ease-out) and is masked to transparent on its left third so ground bands never show a hard edge. Text: Korean name 30px/800 plus the localized name, tagline 600, then the 안내 badge and a white "on your route" pill. City palettes are explore-only decoration, never status, then category chips with line icons (charcoal fill when pressed) and spots as ruled rows. Each row is one Google Maps link (the name's link stretched over the row, soft ground hover, AREX "Open in Google Maps" line with an external icon) led by an 88px, 12px-radius photo from Wikimedia Commons (free licenses only, pre-cropped to 176px in `public/spots`, data in `lib/map/photos.ts`) with a 26px category disc on its corner; the photo eases up 4% on hover. Every photo carries an 11px ink-3 credit line (author → file page, license → license deed, "Wikimedia Commons"). Spots without a fitting free photo keep an 88px category-tint tile with the icon. Category tints are map-only and never used for status: sight `#3d6fa8`/`#e5eef8`, food `#b0532a`/`#fbebe1`, experience `#7a4fb0`/`#efe8f8`, shopping `#b03a6e`/`#f9e6ee`, night `#3b4799`/`#e4e6f5`. Map city names also localize the trip line, the trip pass and transport alerts.

### Panda Guide
Under the map, sharing its sticky column, the panda mascot (user-supplied 3D artwork, background removed, `public/mascot/majung-panda.png`, 480px asset shown at 150px; 96px at ≤760px) introduces the selected city. It bounces in with the shared boing keyframes and its white bubble pops (14px radius, 1px rule, soft offset shadow, rotated-square tail toward the panda). Bubble: Korean line 15px/800 ("여기는 {도시}! 이건 꼭 경험해 보세요"), the localized line 13px/600 ink-2, then a ground-filled pick card (44px photo or icon, Korean spot name 800, two-line description, AREX external icon) that opens Google Maps. The pick is the city's first experience spot. The panel always shows a city (the first itinerary city, else Seoul), so there is no empty state. Layout: a top row of two equal columns — the map | the postcard, panda guide (112px panda) and category chips spread to the map's height — then the spots as a full-width two-column grid of 16px-radius cards (120px photo or tint tile | category with icon, Korean name 16px/800, English name, three-line description, "Open in Google Maps", one-line credit) that lift 2px on hover and stagger in; the last cell is a dashed "Ask Majungi about {city}" card with the panda. Spots are paged five at a time (Seoul 20 → 4 pages, Busan and Jeju 15 → 3, other cities 10 → 2): a centered pager of 40px round buttons (current page filled arex-deep and scaled 1.06, chevron arrows that dim at the ends) sits under the grid; changing city or category returns to page 1 and paging scrolls the grid into view. The old "picked by the Majung team" note is gone.

### Getting There (transport legs)
Between the trip line and the add-city form, each itinerary leg between two different cities is a 12px-radius card: Korean city pair with localized names joined by a drawn arrow, the date, and a status chip (prep tint "no transport", AREX tint "planned", outlined with a check "booked · KTX"). Options are radio rows: 38px mode tile (train, bus, plane, subway line icons; arex-deep fill when chosen), mode name with an arex-deep "Recommended" pill on the first, Korean stations, and an approximate duration. The primary button carries a small panda avatar ("Ask Majung to prepare booking"); pressing it opens an AREX-tint agent panel where the panda nods while three steps tick over 750ms each (spinning AREX ring → arex-deep check disc that pops), then saves the leg as planned and offers "Book on Korail/Kobus/…" (external) and "I booked it". Majung never pays or confirms: the official site does, and only the user marks a leg booked. Subway legs say no booking is needed. A booked leg becomes a **ticket**: a 14px-radius card in a mode palette (KTX `#0b4ea2` → `#2f86e0`; bus `#0d5f73` → `#22a2b8`; flight `#12305a` → `#3c74b8` with a sunset glow) carrying mode and date, Korean stations with English beneath, a dashed track on which a flat side-view vehicle (`VehicleArt.tsx`: KTX, bus, airliner) drives in once from the left (1200ms ease-out), the duration and "Have a great trip!", and a perforated stub with a white check stamp and a barcode. Ticket palettes are decoration only. The leg header also carries the 준비 badge while not booked.

### Trip Pass (signature)
The first thing on the trip board: a boarding-pass card in AREX (trip = AREX) — a 130° gradient `#0a5fa8` → arex-deep → `#003a69` with a white sheen top-left and an info-blue glow bottom-right, 14px radius, the lift shadow. Main part: entry and exit airport codes at 46px/800 with the localized airport name and KST time beneath, joined by a dashed track carrying a white plane disc that flies in once from the left (1400ms ease-out, none under reduced motion); then the cities as Korean + localized pairs joined by short white bars. The stub, behind a dashed perforation with ground-colored notches, holds the trip range (Intl formatRange), nights · days, and the traveler. At ≤640px the stub drops below with a horizontal perforation.

### Flights and Stays
Flights are two ticket columns split by a 1px rule (stacked at ≤640px): roundel, label, flight-number pill with a plane icon, the KST time at 38px/800 and the date with the localized airport, plus an arex-deep terminal pill (T1/T2) when known. Below them, **Airport tips** (안내 badge) sit on a sky-to-sand panel (14px radius) in two columns — "When you land" and "Before you fly out" — each tip a white 12px-radius row with a 34px AREX-tint icon tile, a 13.5px/800 title and a 12.5px body. Content comes from concept.md (terminal T1/T2 for ICN with "Your terminal: T2" when saved, SIM and exchange, T-money; leaving early, tax refund, leftover T-money); the late-night tip appears only for landings between 23:00 and 05:00 and uses a navy tile with a moon. The flight editor now saves terminal and departure airport. Stays are hotel key cards (16px radius, soft navy shadow): a pastel hero band that cycles by stay order (apricot `#ffe2cc`→`#ffd3dc`, lavender `#e6e1ff`→`#d6ecff`, mint `#d9f4e8`→`#e3f1ff`, each with its own deep ink) carrying a 48px white hotel tile, the name 18px/800 with the Korean name or address beneath, and the booking number as a key-card chip; then a check-in → check-out bar whose line fades through the stay's ink with a bed-icon nights pill, the arrival pill (navy with a moon for 22:00–06:00), and pill actions "Open in Google Maps" (Maps URLs search with the Korean name/address) and "Call" (tel:, when a phone is saved). With no stays, a dashed sand-to-sky card explains what adding one unlocks and the add form is open. With no flights, the flight editor is open too. Icons across the board are authored 20px line SVGs at 1.6 stroke (`app/components/icons.tsx`), never emoji.

### Entry Opening (signature)
On the first visit of a session a full-screen arrival scene covers the app: a sky gradient (`#8ec5ef` → `#e8f3fb`) with a sunset glow, drifting clouds, an airliner (VehicleArt) descending toward an airport silhouette (layered blue hills, a wave-roofed terminal, a control tower in navy, a dashed runway). In the middle a passport-like white card (20px radius, deep shadow) pops in: a navy "대한민국 · REPUBLIC OF KOREA" band, a waving Taegukgi drawn to the official construction (`Taegukgi.tsx`), "대한민국 입국" at 40px/800 with the localized title and a line about starting the trip, an entry stamp in stamp red `#d2283a` (double border, rotated, stamps in at 1.5s with the airport code and arrival date), and the "Enter Korea" primary button. The panda (left) and the frog (right) bounce in with bubbles: "Welcome to Korea!!" / "Have a nice trip!!" in AREX deep, Korean beneath, and the user's language when it is neither Korean nor English. Entering lifts the scene away like a gate (760ms) and remembers it in sessionStorage; a pre-paint script marks `html[data-intro-seen]` so returning views never flash it. The footer offers "Watch the opening again". The top-right corner carries the same navy language pill as the header, at exactly the header's position (16px from the top, 19px at ≤560px, aligned to the 1240px column), with its panel opening downward like the header's; choosing a language re-renders the opening in place, greetings included, without closing it. Esc also enters. Scene colors are intro-only. Reduced motion shows the scene still.

### Fresh Start
The opening's "Enter Korea" starts a new, empty trip board when the current one has anything registered (the newest board is always the current one; old boards stay in the database). A quiet underlined "Continue my previous trip" under the button (and Esc) closes the opening without resetting. Language carries over.

### Trip Checklist
Right under the trip pass, with `id="checklist"`: a sign with "{done} of {total} done", a 10px AREX gradient progress bar that eases to its new width, and a two-column grid (one column at ≤640px) of 46px rounded rows. Only items the trip board can answer are listed, and they tick themselves: flights in and out, a stay, cities, late check-in answered for each late-arriving stay (only when arriving late), and rides between cities (only when a leg needs booking). Done rows fill the circle arex-deep with a pop, draw the check stroke and turn AREX-tint with a struck label. Things the board can't know (airport ride, SIM, T-money, won, tax-free receipts, the ride back) are not checkable: they sit below in a dashed ground-colored "Also good to sort out" box as small dotted tips in ink-3. When the last item ticks during a visit, "You're ready for Korea!" pops and 28 confetti pieces burst.

### Board Prep Row
The arrival board's third row, "준비 Prep" with a prep-orange dot, mirrors the checklist: one pill lamp per item (icon + short label) on the dark tile color at 45% ink; done items light up green (act tint, mint text, green glow), flashing on one after another (110ms stagger, 700ms). The right column shows "{done}/{total}" in amber flap tiles and links to the checklist. When nothing more urgent is waiting (approval, alerts, replies), the "이번 Now" row shows the next unfinished checklist item on the prep line.

### Basic Phrases
First panel after the alerts (after active requests), titled "기초 회화" with a chat icon. A three-way segmented control (인사 / 생활 / 위급, Korean bold over the user's language) on ground with a sliding ink chip: arex-deep for greetings, deep teal `#0e7a63` for everyday, alert red for emergency (transform slide, 380ms ease-out). Phrase cards (auto-fill 190px, 2 columns ≤560px) carry the Korean at 20px/800 in the tab tone, the pronunciation written in the user's own script (katakana, Hangul-sound Chinese characters, Thai script, Latin spelled for each language) in ink, and the meaning in ink-2, over a white-to-tint gradient. Tapping reads the Korean with the browser voice (ko-KR, 0.85 rate): the speaker badge fills, its two sound waves blink in turn and a ring pulses out. Cards rise in with a 55ms stagger when a tab opens. The emergency tab first shows an alert-tint box with a blinking siren icon, the "call first" note and three red tel: buttons (112, 119, 1330) — Majungi never calls for the user.

### Show Cards
After stays: tiles in soft tints with a white icon tile and a navy "Show" button. A wide taxi tile (apricot) has optional From and To fields with green/red ring dots and rust pick pills for stays and the four airports; then four tiles in two columns: restaurant (leaf, nine dietary chips), pharmacy (teal-lavender, seven symptom chips), shopping (pink-apricot, six question chips) and "write your own" (periwinkle, a textarea). Chips fill with the tile's tone and pop when on. Typed text without Hangul is turned into Korean by Majungi (a place name for the taxi, a polite 해요체 sentence for the write card); a spinner and "Majungi is translating…" show meanwhile. "Show" opens a full-screen card on a dimmed navy backdrop: white, 26px radius, flipping in (rotateY −70° → 0, 640ms ease-out) with one light sweep, then each Korean line rises in 90ms apart. Korean is huge for the person reading (lead clamp 30–60px/800, address/airport lines clamp 24–44px arex-deep); the taxi card says only "○○까지 가 주세요." with the starting point as a smaller ground pill ("출발: ○○"); the user's language sits small below a dashed rule. Stay cards' "Show to a taxi driver" and the fare check's "Show the driver" open the same taxi card. Esc, the close button or a backdrop tap closes it.

### Call Panel
Inside a request card when calling is the way (no email on the board — the script loads right away) or the better way (email exists but the deadline is close — a "Show the call script" button). A 14px-radius panel on a mint-to-sky gradient (urgent: prep-tint to cream) with a 44px round handset badge (act-deep, prep when urgent) that shakes like a ringing phone and sends out a ring, the title "Call {stay}", a one-line reason, and a green tel: "Call" button (full width ≤560px). The script is numbered white rows (act-deep number dots): Korean 17px/800, pronunciation in act-deep, meaning in ink-2, rising in 80ms apart; "They might say" replies sit in dashed chips. The app never dials; the email draft stays the primary path whenever an email exists.

### Request Focus
When Majungi drafts a message, active requests move above the phrases and trip board, the page scrolls to the newest waiting card and rings it in act green once (1.6s), and the chat reply gets a green "See the draft" pill that does the same.

### Copy and Mail
Under the Korean draft: "Copy Korean" and "Open in my email app" (mailto with subject and body); under the translation: "Copy translation". Pill buttons; on copy the icon swaps to a check with a pop, the pill fills arex-deep, a white ripple spreads from the icon, and it reverts after 1.8s.

### Taxi Fare Check
Last sign on the trip board. A warm sand-to-apricot panel (`#fff8e0` → `#fff1e3`, 16px radius) holds From (act-green ring dot) and To (alert-red ring dot) fields; From has a quiet "My location" button (crosshair icon, spins while locating). Under each field, pill picks for the user's stays (bed icon) and the four airports (plane icon) in a rust tone (`#b0532a`), filling rust with a pop when chosen. A 38px round swap button sits between the ends and spins half a turn on click. Time of ride is a row of radio pills (Now / Daytime / 22–23 · 02–04 / 23–02), checked = signbar navy. The submit button is taxi-yellow (`#ffcd00` → `#ffb000`, dark ink) and its car icon drives back and forth while checking. The result is a taxi meter: board-black screen with faint scanlines and an inset shadow, a "택시 TAXI" roof lamp that flickers on to exit-yellow with a glow, and the fare range in amber LED monospace (tabular, soft glow) that counts up from ₩0 in 100-won steps (1.1s ease-out); under it, for every language but Korean, "≈" the same range in the user's currency (by language: USD, JPY, CNY, TWD, VND, THB, IDR, EUR) in a softer amber monospace that counts up with it, plus a small on-dark-2 note with the rate date (or "approximate rate" when the daily ExchangeRate-API fetch fails and fixed rates are used) and the required source link; below it the route with the same ring dots, km and minutes, and a rate pill (night rates in violet `#3b2f6b`). Then a rust "Show the driver" button that opens the taxi show card for the same trip, and three plain tips. Errors use the prep tint. Fare math is in `lib/taxi/fare.ts` (Seoul medium-taxi rates); places come from OpenStreetMap Nominatim and roads from OSRM, with a straight-line fallback.

### Majungi at Work
While the desk waits for a reply, the old progress bar is replaced by a 260×70 stage with a dashed floor: the frog runs across it and back (2.6s loop, flipping at each end), hopping with a squash-and-stretch, throwing light-blue sweat drops behind its head and grey dust puffs at its feet, above "마중이가 일하는 중" in arex-deep with three bouncing AREX dots. Reduced motion keeps the frog still and hides sweat and dust.

### Arrival Board (FIDS)
The board is now an airport flight information display: a 14px-radius screen in a navy-black gradient (`#131c2a` → `#0a0e15`) with a faint blue sheen top-left, a 1px `#263246` bezel line, an inner highlight and the lift shadow. Top bar (three columns): amber plane icon with "도착 ARRIVALS", the nine-language welcome ticker set in split-flap tiles in the middle, and the KST clock in tiles with an amber live dot. Tiles are two-tone (board-tile over board-tile-2) with a dark 1px hinge at mid-height and flip when their text changes, so the clock flips each minute and the welcome word flips every 3.2s. The "다음" countdown is set in larger amber tiles. Rows keep 이번/다음 with line-color lamps (no glow). On mobile the welcome tiles drop to their own row.

### From the Airport (transfers)
In the flights sign, under the flight tickets: a 92px panda with a bubble that adapts to the landing time (Korean line plus the user's language). For landings between 23:00 and 05:00 the bubble turns night navy and recommends booking an International Taxi ahead (set fares, multilingual drivers) to avoid overcharging; in the daytime it recommends the airport railroad. Options are rows like the transport legs (38px mode tile, name, a "Recommended" pill on the first, a stamped 안내/준비 badge, a one-line note, approximate duration). Bookable options get a primary "Go to booking" external button (International Taxi → its official site); info-only ones get a quiet "See details" link; regular taxis say no booking is needed. Options that don't run at that hour sink to the bottom at 55% opacity with "Not running at this hour". Data lives in `lib/transport/airport.ts` (ICN, GMP).

### Routes Through Another City
When two cities have no direct route, the leg shows a prep-tint "no direct route" note and up to two plans through a hub city (shortest first, 30 min transfer added). A via plan row reads "Via {city}" with a dashed AREX mini-line joining its two segments (mode icon, mode, Korean stations), each rising in 120ms apart, and an info-tint "Change in {city}" pill. Getting it ready offers one booking button per bookable segment; the booked ticket names both modes ("Flight + Subway") and runs from the first segment's station to the last one's.

### Route Grouping and Flags
Consecutive days in the same city are one station with a date range and a small info-tint "N days" pill, so the line never runs from a city to itself. Without an arrival flight the first city carries a green "출발 Start" pill; without a departure the last city carries a checkered navy "도착 Finish" pill. Both pop in.

### Route Stop Removal
Every city station on the trip line carries a 24px round × button (white, rule stroke, ink-3, 70% opacity until the stop is hovered; alert stroke/tint on hover). It removes that stop (every day of it) from the itinerary through a server action. On the vertical mobile route it sits at the right of the stop, fully opaque.

### Badge Stamp
안내 / 준비 / 대행 pills stamp in whenever they mount (scale 1.7 → 0.94 → 1 with a slight rotation, 520ms ease-out): the line guide, alerts, request cards (re-keyed by request status, so they stamp again on every state change), the transport leg (re-keyed by the prep phase), the airport tips and the city postcard. Reduced motion shows them still.

### Information Desk
The chat as a fixed desk: sign panel whose charcoal title bar carries a 4px AREX underline. Agent speech: 40px mascot-head avatar (white gap, 2px AREX ring) plus a concrete-gray bubble; error replies use the same avatar with an alert-tint bubble; visitor speech: charcoal bubble, right-aligned, no avatar. Working state is the "Majungi at Work" stage (below). Safety cards (112 / 119 / 1330 / 1345) render without the mascot. Empty state: the full-body mascot at 140px beside a greeting bubble set like a sign (Korean 17px/800, user language 600 ink-2 beneath, note in ink-2), then example prompts as quiet rows with an AREX ring marker, hover AREX stroke and info-tint.

### Mascot
Majung is user-supplied 3D frog artwork with its background removed: a 280px full-body asset shown at 140px in the empty desk, and a 192px head crop used in the header roundel (44px, on sign white inside the brand ring) and as the 40px chat avatar. The artwork's own colors stay inside the image and license no new CSS colors. Motion: boing (squash-and-stretch keyframes, 680ms ease-out) and bubble pop on each new reply; an AREX spark burst on new assistant replies only, never on errors; a slow nod while pending.

### Report
Same signbar header (mascot roundel, "back to app" tagline), Korean-only. A bar sign compares before and after per metric: label column 170px, then two 26px tracks on ground, before in rule-strong and after in AREX, growing from zero over 900ms with a 120ms stagger and the after bar 300ms later; values count up outside the tracks in a 4.5em column. The 능동 소요 시간 row carries a reduction chip (arex-deep pill, white −N%). Tables below use tabular figures and stack to labelled rows at ≤560px. The main page no longer links to it (removed from the footer); it is reachable only at /report.

### Reduced Motion
Every animation and transition is zeroed under prefers-reduced-motion by one global rule; state is still carried by position, color and text (the train jumps, doors are not needed for the send to complete, counts show final values).

## Do's and Don'ts

### Do:
- **Do** head every sign panel with a full-bleed charcoal bar carrying Korean and the user's language.
- **Do** use line colors only as codes: act for 대행, prep for 준비, info for 안내, AREX for the agent and trip, exit yellow for executed tool calls.
- **Do** keep AREX (#0065b3) and Line 4 sky (#00a5de) visually separate in every new surface.
- **Do** isolate an irreversible action on its own full-width act-deep bar, with secondary actions above it.
- **Do** use deep line variants (act-deep, prep-deep, info-deep, arex-deep) whenever line-colored text or a fill carrying white text sits on white.
- **Do** draw sequences as lines with station dots and roundels, vertical on narrow screens.
- **Do** use tabular figures for times, dates and reference numbers.
- **Do** keep motion mechanical and causal: flaps turn only when text changes, doors close only while a real send runs.
- **Do** draw Majung's sparks and avatar ring in AREX; the agent's color is the agent's code.

### Don't:
- **Don't** introduce a second display face or a decorative script; Pretendard carries every role.
- **Don't** use a line color as a generic accent, background wash, or decorative stripe.
- **Don't** draw a multi-color line stripe in the header; the header carries one AREX rule.
- **Don't** show a 확정 (confirmed) badge or any badge without its Korean term.
- **Don't** draw an exit tile for a tool call that did not run.
- **Don't** use emoji for flags; flags are authored SVG with a 1px hairline ring and 2px radius.
- **Don't** put the mascot on safety cards (112 / 119 / 1330 / 1345).
- **Don't** animate board text on plain page load.
- **Don't** use board, board-rule or led outside the arrival board.
- **Don't** sample colors from the mascot artwork into the UI palette.
