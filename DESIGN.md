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

# Design System: 마중 Majung

## Overview

**Creative North Star: "The Seoul Metro Platform"**

Majung reads like the Seoul Metro wayfinding system. The page is a platform: a cool concrete-gray ground carrying white sign panels, each headed by a charcoal signage bar. Every request is a line ridden station by station to its end, the trip itself is drawn as a line with cities as stations, and every sign carries Korean and the visitor's language together, Korean bold on top, translation beneath.

Line colors are codes, not decoration. Line 2 green means 대행 (We send it), Line 3 orange means 준비 (Prep), Line 4 sky means 안내 (Info), AREX deep blue is Majung the agent and the trip line, and the yellow exit-number tile marks a tool call that actually ran. Each color appears at full strength where it codes something and nowhere else. Density is calm and legible enough for a phone at 1:30 AM and a classroom projector; hierarchy comes from scale and weight contrast within a single family, not from color or ornament.

The system refuses the default travel-app dashboard of rounded white cards with a floating chat bubble: panels are square-shouldered signs, the chat is a fixed information desk, and the one irreversible action (approving a send) sits alone on a full-width green bar.

**Key Characteristics:**
- Concrete-gray ground, white sign panels, charcoal signage bar on every panel title.
- Bilingual stacks everywhere: Korean (800 weight) first, user language (500 weight, ink-2) beside or beneath.
- Line color as code at full strength; never decorative, never tinted into backgrounds except selection and hover states of the AREX/Info family.
- Roundels (station-number circles) for airports, the agent, and the brand.
- An arrival board (전광판) opens the main column: a dark LED screen that is the one non-sign material in the world.
- Signature motion is mechanical, like the metro: the train marker slides along a route strip, changed board text turns over like split-flap, approving closes screen doors over the sign.
- Majung the mascot (supplied 3D artwork) staffs the information desk; the artwork is an asset, never a source of CSS color.

## Colors

A neutral signage palette (cool gray, white, charcoal) with five transit codes held at full saturation.

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
- **Platform Concrete** (ground): page background, recessed areas inside signs (editor forms, the back-translation panel, agent speech).
- **Sign White** (sign): every sign panel, field, quiet button.
- **Signage Charcoal** (signbar): header, panel title bars, station-sign bar, primary buttons, the visitor's own speech. signbar-2 and signbar-rule are the raised control and hairline inside the dark header; signbar-hover is the hover tone for dark controls.
- **Ink** (ink, ink-2, ink-3): primary text; secondary text and translations; placeholders and unreached stations.
- **On-dark** (on-dark, on-dark-2): text on charcoal; on-dark-2 for the translation line inside a dark bar.
- **Rules** (rule, rule-strong): hairlines between sign rows and panel borders; quiet-button and field strokes, dashed unarranged track. rule-strong is also the neutral "before" bar on the report.

### Board Material
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

### Information Desk
The chat as a fixed desk: sign panel whose charcoal title bar carries a 4px AREX underline. Agent speech: 40px mascot-head avatar (white gap, 2px AREX ring) plus a concrete-gray bubble; error replies use the same avatar with an alert-tint bubble; visitor speech: charcoal bubble, right-aligned, no avatar. Working state is a 72px track with a sliding AREX segment while the avatar nods. Safety cards (112 / 119 / 1330 / 1345) render without the mascot. Empty state: the full-body mascot at 140px beside a greeting bubble set like a sign (Korean 17px/800, user language 600 ink-2 beneath, note in ink-2), then example prompts as quiet rows with an AREX ring marker, hover AREX stroke and info-tint.

### Mascot
Majung is user-supplied 3D frog artwork with its background removed: a 280px full-body asset shown at 140px in the empty desk, and a 192px head crop used in the header roundel (44px, on sign white inside the brand ring) and as the 40px chat avatar. The artwork's own colors stay inside the image and license no new CSS colors. Motion: boing (squash-and-stretch keyframes, 680ms ease-out) and bubble pop on each new reply; an AREX spark burst on new assistant replies only, never on errors; a slow nod while pending.

### Report
Same signbar header (mascot roundel, "back to app" tagline), Korean-only. A bar sign compares before and after per metric: label column 170px, then two 26px tracks on ground, before in rule-strong and after in AREX, growing from zero over 900ms with a 120ms stagger and the after bar 300ms later; values count up outside the tracks in a 4.5em column. The 능동 소요 시간 row carries a reduction chip (arex-deep pill, white −N%). Tables below use tabular figures and stack to labelled rows at ≤560px.

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
