# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Short-term visitors to Korea who do not speak Korean and are in Korea for the first time: travelers, business travelers, trainees, event attendees, transit passengers. They reach for 마중 (Majung) at moments when they must talk to a Korean business (a hotel, a restaurant) and cannot, for example arriving at the hotel at 1:30 AM without knowing whether anyone will let them in. A second audience evaluates the product: professors and classmates at a Korean university presentation on October 15, 2026, watching a live demo.

## Product Purpose

Majung is a work AI agent, not an information chatbot. Given a goal, it checks conditions on the trip board, chooses a tool, acts, observes the result, and decides the next step. Its promise: "We follow through to the end, and we send what can be sent for you." Success is a visitor finishing a request (first case: a late check-in inquiry) by only typing a goal, answering what is missing, and approving, while the app writes Korean, sends it after approval, and reads the reply back in their language. The class assignment also requires a measurable before/after workflow comparison.

## Positioning

One trip board remembers arrival, stays, cities, and request status, so the agent never asks for the same thing twice and can notice what is missing before the visitor does. Every feature carries an honest execution label: 안내 Info, 준비 Prep, 대행 We send it. Nothing is sent without the visitor seeing the Korean original next to a translation back into their own language and approving it.

## Operating Context

Single screen web app (Next.js) used on a laptop or phone, often late at night, in transit, on unfamiliar networks. Layout today: trip board (flights, stays, cities), requests with approval cards, and a chat with the agent. Demonstrated on a projector in a classroom. Mail is mock-sent to a local outbox during development and demo; nothing reaches real businesses.

## Capabilities and Constraints

- Languages for the interface, the agent's replies, and back-translations: English, 日本語, 简体中文, Tiếng Việt, ภาษาไทย, Bahasa Indonesia, Español, Français, 한국어 (Korean is for the presentation demo). Chosen with a flag button and a dropdown panel in the header. Messages sent to businesses are always Korean.
- Out of scope: payment, identity verification, confirmed bookings ("확정"), visas and immigration (point to 1345), acting in emergencies (show 112, 119, 1330 first).
- Request types are data, not code. Approval gate is enforced in code; the language model has no send tool.
- Personal data kept to what a request needs; pasted booking text is not stored.

## Brand Commitments

- Name: 마중 (Majung), meaning going out to meet someone who is arriving. Tagline: 한국 도착 전부터 출국까지, 옆에서 챙기고 대신 처리해 주는 여행 비서.
- Execution badges 안내 / 준비 / 대행 always appear with their Korean term; "확정" never appears as a badge.

## Evidence on Hand

- Synthetic demo data only: the persona Emma Smith, Hotel Example Myeongdong, booking BK123456, `.test` email domains (lib/board/demo.ts). No real customers, businesses, testimonials, or usage numbers exist; do not invent them.
- Before/after workflow estimates in docs/PRD.md §5 are labeled estimates.

## Product Principles

1. Never ask twice: anything on the board is reused, not re-asked.
2. Show before sending: Korean original and back-translation side by side, then explicit approval.
3. Be honest about reach: label each capability Info, Prep, or We send it; never imply a booking is confirmed.
4. Safety over agency: in emergencies, official numbers first, the app does not act.

## Accessibility & Inclusion

Users read in their own language and script (Latin, CJK, Thai); text must not break mid-word in Korean and must wrap safely in all nine languages. Usable on a phone at 390px and readable on a classroom projector.
