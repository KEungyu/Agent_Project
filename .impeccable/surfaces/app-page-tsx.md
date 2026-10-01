---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/globals.css","app/components"]
---

# Surface brief: main app screen (/)

Scope: the single Majung screen (header with language picker, trip board, requests with approval, chat). Mode: Operate.
Audience and job: a non-Korean-speaking visitor finishing a request (late check-in) by stating a goal, answering only what is missing, and approving Korean they can verify. Also shown on a classroom projector.
Constraints: nine languages (en, ja, zh-CN, zh-TW, vi, th, id, es, ko) switch UI strings, agent replies, and back-translations; flags via authored SVG files, never emoji; badges keep their Korean term; no "확정" badge; light theme.
Scene: a visitor checking their phone in a bright arrivals hall or a lit hotel lobby at night, and a projector in a lit classroom; light ground wins.

## Direction contract

THESIS: Majung reads like the Seoul Metro wayfinding system: every request is a line you ride station by station to its end, and every sign carries Korean and your language together. It refuses the default travel-app dashboard of rounded white cards plus a floating chat bubble.

OWN-WORLD: Platform-concrete ground (cool light gray), white sign panels with a charcoal signage bar, line colors used strictly as codes (Line 2 green = 대행 We send it, Line 3 orange = 준비 Prep, Line 4 sky = 안내 Info, AREX blue for the agent), station-number roundels, yellow exit-number tiles for tool calls, bilingual stacks (Korean bold, translation beneath). Pretendard throughout, tabular figures.

STORY: The visitor sees their trip as a line (cities as stations, unarranged transport as dashed track), sees each request's position on its own line, reads the Korean on a station-name sign with their language underneath, and approves with one isolated green control.

FIRST VIEWPORT: Charcoal signage header: roundel logo 마중, tagline, flag language pill at right. Left column: trip line diagram over flights and stays sign rows. Below, requests as route strips; a pending draft expands into a full-width station-name sign with the Korean original and back-translation and a lone "Approve and send" bar. Right column: information-desk chat with yellow tool tiles.

FORM: Seoul Metro wayfinding, my ordered list position 1 (chosen as IMPECCABLE'S PICK over the rolled 원고지 desk), seed key d72e0716.
Raises kept: irreversible approve control isolated in its own space (from dark console); a pending draft owns the full column width (from vertical feed); line color committed at full strength as code, never scattered (from guide map); hierarchy by scale contrast (from type specimen).
Signature interaction: when a request moves to its next state, the train marker slides along its route strip to the next station (reduced motion: jumps).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
