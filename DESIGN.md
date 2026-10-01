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
- One signature motion: the train marker slides along a request's route strip to its next station.

## Colors

A neutral signage palette (cool gray, white, charcoal) with five transit codes held at full saturation.

### Primary
- **AREX Deep Blue** (arex): Majung's own line. The header's single bottom rule (5px), the information desk's title underline (4px), trip-route track and station rings, the working indicator, the focus outline, the selected language border.
- **AREX Night Blue** (arex-deep): solid fills that must carry white text: airport code roundels, the agent's chat roundel, the large airport stations on the trip line, field focus border, caret and accent color.

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
- **Rules** (rule, rule-strong): hairlines between sign rows and panel borders; quiet-button and field strokes, dashed unarranged track.

### Named Rules
**The Line Code Rule.** A line color appears only where it codes its meaning: green for 대행, orange for 준비, sky for 안내, AREX for the agent and the trip, yellow for a tool call that ran. No line color is used as generic accent or decoration.

**The AREX Is Not Line 4 Rule.** AREX deep blue and Line 4 sky are distinct and must stay distinct: the agent is never drawn in sky, and Info is never drawn in AREX blue.

**The Honest Exit Rule.** Yellow exit tiles appear only for tool calls that actually executed; a failed call shows in alert-tint, and no tile is drawn for an intended or hypothetical call.

## Typography

**Display Font:** Pretendard (variable, 45-920), with -apple-system, Apple SD Gothic Neo, Noto Sans KR
**Body Font:** Pretendard, with per-language fallbacks: Hiragino Sans / Noto Sans JP for ja, PingFang SC / TC for zh, Noto Sans Thai for th
**Label/Mono Font:** ui-monospace, used only inside exit tiles

**Character:** One sans throughout, like transit signage: Korean set heavy and tight, the visitor's language lighter and grayer beside it. Hierarchy is scale and weight, never a second display face.

### Hierarchy
- **Display** (800, 32px, 1.2): section sign titles (여행 보드, 요청), Korean only, with the user-language line at 14px/500 beneath.
- **Headline** (800, 19px, 1.4): the Korean subject on a station-name sign and the information desk title.
- **Title** (800, 17px, 1.2): panel title on a signage bar, user language 13px/500 inline beside it. Request titles run 18px/800.
- **Body** (400, 15px, 1.55): default text, chat speech (1.6). Korean draft body runs 17px/1.8, back-translation 15px/1.65, both capped at 68ch.
- **Label** (600, 12-13px): form labels, route-strip station names, trip meta, badge labels. Not uppercase.

### Named Rules
**The Bilingual Stack Rule.** Every sign title is Korean first at 800 weight, the user's language second at 500 weight in ink-2 (on-dark-2 on charcoal). On the Korean UI the second line is omitted, never duplicated.

**The Tabular Rule.** Times, dates, booking numbers and flight data use tabular figures.

**The Keep-All Rule.** Korean text never breaks mid-word (word-break: keep-all); Thai runs at line-height 1.7.

## Layout

A centered platform of 1240px max with 16px gutters: a fluid main column and a 380px information desk on the right, 28px apart, 28px top and 72px bottom padding. Main-column sections stack 40px apart; panels inside a section stack 14px apart. Sign panels pad 20px (16px at ≤560px).

The desk is sticky at 16px from the top and fills the viewport height on wide screens. At ≤1040px the grid collapses to one column, the desk drops below and turns static, and an "Ask Majung" pill appears in the header to jump to it. At ≤960px the header legend of execution pills hides. At ≤640px the trip line turns vertical: stations stack with a 4px AREX track down the left at 18px, airports as 40px roundels, unarranged segments dashed. At ≤560px inline forms stack, the tagline and the language name hide (flag only).

## Elevation & Depth

Mostly flat, signage-like. Sign panels sit on the concrete ground with a hairline border and a barely-there shadow; depth comes from the charcoal bars and the ground/white contrast, not from lift. Real lift is reserved for things that float: the language popover and the request awaiting approval.

### Shadow Vocabulary
- **Sign** (`0 1px 2px rgb(21 24 28 / 0.06), 0 1px 1px rgb(21 24 28 / 0.04)`): every resting sign panel, request, and the desk.
- **Lift** (`0 14px 36px rgb(21 24 28 / 0.18), 0 2px 6px rgb(21 24 28 / 0.08)`): the language popover.
- **Focus request** (`0 10px 28px rgb(21 24 28 / 0.12)`): the request awaiting approval.
- **Train** (`0 2px 6px rgb(21 24 28 / 0.25)`): the train marker on a route strip.

### Named Rules
**The Flat Platform Rule.** Signs rest flat; only floating or awaiting-action surfaces lift.

## Shapes

Square-shouldered signs with a small 6px radius on panels, fields and buttons; 10px for the popover and speech bodies; 3px for exit tiles and the demo tag; full pills for execution badges, the language button and round counters; perfect circles for every roundel and station dot. Charcoal title bars bleed edge to edge inside their panel (no inset, panel clips them). Track is a 4px bar; unarranged track is a dashed 8px-on/6px-off repeat. Ring roundels (the brand, desk example markers, trip stations) use a white or charcoal gap ring before the colored ring.

## Components

### Buttons
Plain signage controls, bold text, no icons except the approve arrow.
- **Shape:** gently squared (6px), 42px minimum height.
- **Primary:** charcoal fill, white text, 14px/700, 8px 18px. Hover signbar-hover.
- **Quiet:** white with rule-strong stroke, ink text, 14px/600. Hover: ground fill, ink-3 stroke. Also used as the summary of collapsible editors.
- **Approve:** the lone full-width bar, act-deep, white 16px/700, 52px tall, trailing arrow. Hover act-hover.
- **Small:** 32px, 4px 10px, 13px (retranslate).
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
- **Header (signage bar):** charcoal, single 5px AREX bottom rule. Brand roundel (마, 44px, act-deep with a green ring), 마중 at 21px/800 with "Majung" 13px on-dark-2, tagline 13px. Right: execution legend, then the language pill (signbar-2, signbar-rule stroke, flag + native name + chevron).
- **Language panel:** popover under the header, white, 10px, lift shadow, 3-column grid (2 at ≤520px) of 56px options; selected option has a 2px AREX border and info-tint wash with an arex-deep check. Fades and drops 6px in over 160ms.

### Station-Name Sign (signature)
The approval surface. A charcoal bar states what will be sent and to whom; below, the Korean subject (19px/800) and body (17px/1.8) on white; then the back-translation on concrete ground; then an actions area with the quiet "Request changes" control and the not-sent note on one row and the full-width approve bar alone beneath.

### Route Strip (signature)
Five stations (draft, awaiting approval, sent, awaiting reply, outcome) on a 4px track in the request's line color. Passed stations fill solid, the current label goes ink 700, outcome labels take their meaning color. A pill-shaped train marker (30×18, white 3px ring) slides to the current station over 520ms ease-out; reduced motion jumps.

### Trip Line
Cities as white-centered AREX ring stations on a 4px AREX track between airport roundels (40px arex-deep, white code). A segment with no transport arranged is dashed rule-strong with a prep-deep label. Horizontal and scrollable on wide screens, vertical at ≤640px.

### Information Desk
The chat as a fixed desk: sign panel whose charcoal title bar carries a 4px AREX underline. Agent speech: 28px arex-deep roundel plus a concrete-gray bubble; visitor speech: charcoal bubble, right-aligned. Working state is a 72px track with a sliding AREX segment. Empty state offers example prompts as quiet rows with an AREX ring marker, hover AREX stroke and info-tint.

## Do's and Don'ts

### Do:
- **Do** head every sign panel with a full-bleed charcoal bar carrying Korean and the user's language.
- **Do** use line colors only as codes: act for 대행, prep for 준비, info for 안내, AREX for the agent and trip, exit yellow for executed tool calls.
- **Do** keep AREX (#0065b3) and Line 4 sky (#00a5de) visually separate in every new surface.
- **Do** isolate an irreversible action on its own full-width act-deep bar, with secondary actions above it.
- **Do** use deep line variants (act-deep, prep-deep, info-deep, arex-deep) whenever line-colored text or a fill carrying white text sits on white.
- **Do** draw sequences as lines with station dots and roundels, vertical on narrow screens.
- **Do** use tabular figures for times, dates and reference numbers.

### Don't:
- **Don't** introduce a second display face or a decorative script; Pretendard carries every role.
- **Don't** use a line color as a generic accent, background wash, or decorative stripe.
- **Don't** draw a multi-color line stripe in the header; the header carries one AREX rule.
- **Don't** show a 확정 (confirmed) badge or any badge without its Korean term.
- **Don't** draw an exit tile for a tool call that did not run.
- **Don't** use emoji for flags; flags are authored SVG with a 1px hairline ring and 2px radius.
