// 사용법: npm run build && npx tsx scripts/qa/browser-checks.mts [--chat] [--live]
// --live: .env의 ODSAY_API_KEY로 실제 지하철 경로 조회까지 확인한다 (없으면 키를 비운 상태로 "연결 안 됨" 안내를 확인)
// 빌드한 앱을 임시 DB·임시 발송함으로 3002번 포트에 띄우고, 헤드리스 Chrome(CDP)으로 화면을 조작해 확인한다.
// 가상 예약(데모 보드)만 쓰고 메일은 모의 발송이다. --chat 을 주면 실제 LLM으로 채팅 1턴(Catchtable 연결)을 더 확인한다.
// 결과는 docs/qa-runs/<날짜>-browser.md 에 남는다.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { seedDemoBoard } from "../../lib/board/demo";
import { getBoard } from "../../lib/board/store";
import { openDb, type Db } from "../../lib/db/client";
import { requests } from "../../lib/db/schema";
import { checkConditions } from "../../lib/requests/conditions";
import { hashDraft } from "../../lib/requests/drafting";
import { addReply, applyInterpretation } from "../../lib/requests/replies";
import { createRequest, getRequest, transition } from "../../lib/requests/state";
import { loadRequestTypes } from "../../lib/request-types/loader";
import { reproLine, runInfo, saveRunLog } from "./run-info";

const PORT = 3002;
const SCHEDULED = process.argv.includes("--scheduled"); // 시각 지정 경로만 실제 조회(일반 경로/지도 검색 생략)
const LIVE = process.argv.includes("--live") || SCHEDULED;
const BASE = `http://localhost:${PORT}/`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "majungi-browser-"));
const dbFile = path.join(work, "app.db");
const outbox = path.join(work, "outbox");
const log: string[] = [];
const results: { id: string; ok: boolean; detail: string }[] = [];
const say = (line: string) => {
  console.log(line);
  log.push(line);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const record = (id: string, ok: boolean, detail: string) => {
  results.push({ id, ok, detail });
  say(`- ${ok ? "PASS" : "FAIL"} ${id} — ${detail}`);
};

// ── 데이터 준비: 데모 보드 + 승인 대기 초안 하나 ──
const db: Db = openDb(dbFile);
const board = seedDemoBoard(db);
const lateCheckin = loadRequestTypes().types.find((t) => t.id === "late_checkin")!;
function freshPending(): string {
  db.$client.prepare("DELETE FROM request_history").run();
  db.$client.prepare("DELETE FROM replies").run();
  db.$client.prepare("DELETE FROM requests").run();
  db.$client.prepare("UPDATE stays SET email = 'hotel@example.com', expected_arrival = '2026-10-20T01:30+09:00' WHERE board_id = ?").run(board.id);
  const current = getBoard(db, board.id)!;
  const slots = checkConditions(lateCheckin, current).filled;
  const request = createRequest(db, { boardId: board.id, typeId: "late_checkin", targetId: current.stays[0].id, slots }, "agent");
  const subject = "늦은 체크인 문의";
  const body = `안녕하세요. 예약자 ${slots.guest_name}, 예약번호 ${slots.booking_ref}입니다. 2026년 10월 20일 01:30 KST 도착 예정입니다.`;
  transition(db, request.id, "pending_approval", "agent", {
    patch: { draft: { subject_ko: subject, body_ko: body, back_translation: "Subject: Late check-in", hash: hashDraft(subject, body) }, channel: "email" },
  });
  return request.id;
}
const outboxCount = () => {
  try {
    return readdirSync(outbox).length;
  } catch {
    return 0;
  }
};

// ── CDP ──
let ws: WebSocket;
let chrome: ChildProcess;
let msgId = 0;
const pending = new Map<number, (value: { result?: { result?: { value?: unknown } } }) => void>();
async function cdp(method: string, params: object = {}) {
  return new Promise<{ result?: { result?: { value?: unknown } } }>((resolve) => {
    const n = ++msgId;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function js<T = unknown>(expression: string): Promise<T> {
  const r = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  return r.result?.result?.value as T;
}
async function goto(width: number, mobile = false) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height: mobile ? 844 : 900, deviceScaleFactor: 1, mobile });
  await cdp("Page.navigate", { url: BASE });
  await sleep(3000);
}
async function startChrome() {
  const port = 9600 + Math.floor(Math.random() * 300);
  chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(work, "chrome")}`, "about:blank"], { stdio: "ignore" });
  let target: { type: string; webSocketDebuggerUrl: string } | undefined;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(200);
    try {
      target = ((await (await fetch(`http://127.0.0.1:${port}/json`)).json()) as (typeof target)[]).find((t) => t?.type === "page");
    } catch {
      // Chrome이 아직 뜨지 않았다
    }
  }
  if (!target) throw new Error("Chrome did not start");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => {
    const msg = JSON.parse(String(e.data));
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg);
      pending.delete(msg.id);
    }
  });
  await cdp("Page.enable");
}

let server: ChildProcess;
async function startServer() {
  server = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
    env: { ...process.env, DATABASE_FILE: dbFile, OUTBOX_DIR: outbox, MAIL_MODE: "mock", ...(LIVE ? {} : { ODSAY_API_KEY: "" }) },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // 아직 준비 중
    }
  }
  throw new Error("server did not start");
}

const clickApprove = (times = 1) =>
  js(`(async()=>{const b=document.querySelector('.button-approve'); if(!b) return 'no-button'; for(let i=0;i<${times};i++) b.click(); await new Promise(r=>setTimeout(r,2500)); return document.querySelector('.station-sign .alert')?.textContent ?? ''})()`);

const info = runInfo();
async function main() {
  say("# 브라우저 검사 기록 (헤드리스 Chrome · 프로덕션 빌드)");
  say("");
  say(`- 코드: ${info.commit} · Node ${info.node} · 발송 모드 mock (임시 발송함) · 가상 예약(데모 보드)`);
  say(`- 시작: ${info.startedAt}`);
  say(reproLine(info));
  say(`- 실제 호출: LLM ${process.argv.includes("--chat") && !SCHEDULED ? "사용(--chat, 무료 한도 소모)" : "안 함"} · ODsay ${LIVE ? "사용(--live/--scheduled, 하루 한도 소모)" : "안 함(키 비움)"} · 지도 검색(OpenStreetMap Nominatim) ${SCHEDULED ? "안 함" : "사용(N03)"} · 임시 DB·임시 발송함·모의 발송`);
  say("");
  await startServer();
  await startChrome();
  if (SCHEDULED) {
    await goto(1280);
    const prepare = `const w=(ms)=>new Promise(r=>setTimeout(r,ms)); const t=document.querySelector('.transit'); const type=async(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); await w(300)}; const pick=async(el,v)=>{await type(el,v);el.closest('.station-search').querySelector('.station-results button')?.click();await w(300)};`;
    const normal = await js<{ paths: number; text: string; overflow: boolean }>(`(async()=>{${prepare} const [a,b]=t.querySelectorAll('.transit-fields input'); await pick(a,'인천공항1터미널'); await type(t.querySelector('.airport-departure input[type=datetime-local]'),'2026-10-20T21:00'); await pick(b,'명동'); t.querySelector('.airport-departure input[type=checkbox]').click(); for(let k=0;k<60&&!t.querySelector('.transit-paths > li,.transit-online .ag-warn');k++)await w(500); return {paths:t.querySelectorAll('.transit-paths > li').length,text:t.querySelector('.transit-online').innerText,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()`);
    record("F3-B1 실제 시각 지정 정상 경로·환승·데스크톱", normal.paths > 0 && /21:03:00/.test(normal.text) && /21:46:30/.test(normal.text) && !/undefined/.test(normal.text) && !normal.overflow, JSON.stringify(normal));
    if (!normal.paths) return; // 인증·한도 오류가 났으면 추가 조회하지 않는다
    await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const fallback = await js<{ paths: number; text: string; overflow: boolean }>(`(async()=>{${prepare} await type(t.querySelector('.airport-departure input[type=datetime-local]'),'2026-10-20T23:59'); t.querySelector('.airport-departure input[type=checkbox]').click(); for(let k=0;k<60&&!t.querySelector('.transit-online .ag-warn');k++)await w(500); return {paths:t.querySelectorAll('.transit-paths > li').length,text:t.querySelector('.transit-online').innerText,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()`);
    record("F3-B2 실제 첫차 대체 안내·정상 카드 없음·390px", fallback.paths === 0 && /first-train alternative/.test(fallback.text) && !fallback.overflow, JSON.stringify(fallback));
    return;
  }

  // E: 변경 없는 정상 승인
  let id = freshPending();
  await goto(1280);
  let before = outboxCount();
  let alert = await clickApprove();
  const sent = outboxCount() - before;
  const file = sent ? JSON.parse(readFileSync(path.join(outbox, readdirSync(outbox).at(-1)!), "utf8")) : null;
  record("승인 E (정상 승인)", !alert && sent === 1 && getRequest(db, id)!.status !== "pending_approval" && JSON.stringify(file).includes("hotel@example.com"), `발송함 +${sent}, 상태 ${getRequest(db, id)!.status}`);

  // F: 빠른 중복 클릭
  id = freshPending();
  await goto(1280);
  before = outboxCount();
  await clickApprove(3);
  record("승인 F (빠른 중복 클릭)", outboxCount() - before === 1, `발송함 +${outboxCount() - before}`);

  const conditionalReply = addReply(db, id, "22시까지 온라인 체크인을 완료하시면 입실 가능합니다.");
  applyInterpretation(db, conditionalReply, { class: "conditional", conditions: ["Complete online check-in by 22:00 KST"], requested_info: [], summary: "Online check-in required by 22:00 KST", confidence: 0.95, needs_user_check: false });
  await goto(390, true);
  const conditionChecks = await js<{ initially: boolean; one: boolean; both: boolean }>(`(async()=>{const root=document.querySelector('.followups'); const b=[...root.querySelectorAll('button')].find(x=>/I've done/.test(x.textContent)); const checks=root.querySelectorAll('input[type=checkbox]'); const initially=b.disabled; checks[0].click(); await new Promise(r=>setTimeout(r,100)); const one=b.disabled; checks[1].click(); await new Promise(r=>setTimeout(r,100)); const both=!b.disabled; b.click(); await new Promise(r=>setTimeout(r,1200)); return {initially,one,both};})()`);
  record("F2-B5 (조건 이행과 기한 확인 후에만 완료)", conditionChecks.initially && conditionChecks.one && conditionChecks.both && getRequest(db, id)?.status === "done", JSON.stringify(conditionChecks));

  await js(`(async()=>{const input=document.querySelector('.desk-input input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Keyboard check'); input.dispatchEvent(new Event('input',{bubbles:true})); await new Promise(r=>setTimeout(r,100)); input.focus();})()`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const keyboard = await js<boolean>(`document.activeElement === document.querySelector('.desk-input button[type=submit]')`);
  record("F2-B6 (채팅 입력에서 Tab 키로 전송 버튼 이동)", keyboard, String(keyboard));

  // A: 카드가 V1을 보는 동안 서버 본문이 V2로 바뀜
  id = freshPending();
  await goto(1280);
  const draft = getRequest(db, id)!.draft!;
  const v2 = draft.body_ko.replace("01:30", "02:30");
  db.update(requests).set({ draft: { ...draft, body_ko: v2, hash: hashDraft(draft.subject_ko, v2) } }).where(eq(requests.id, id)).run();
  before = outboxCount();
  alert = await clickApprove();
  record("승인 A (본문 V1→V2)", !!alert && outboxCount() === before && getRequest(db, id)!.status === "pending_approval", `안내 "${alert}", 발송함 +${outboxCount() - before}`);

  // B: 카드가 수신처 A를 보는 동안 숙소 이메일이 B로 바뀜
  id = freshPending();
  await goto(1280);
  db.$client.prepare("UPDATE stays SET email = 'other@example.com' WHERE board_id = ?").run(board.id);
  before = outboxCount();
  alert = await clickApprove();
  record("승인 B (수신처 A→B)", !!alert && outboxCount() === before && getRequest(db, id)!.status === "pending_approval", `안내 "${alert}", 발송함 +${outboxCount() - before}`);

  // C·A06: 공항 안내의 숙소 도착 시각 폼으로 시각을 바꾼 뒤 예전 초안 승인
  id = freshPending();
  await goto(1280);
  const saved = await js<string>(`(async()=>{const f=document.querySelector('.ag-hotel'); if(!f) return 'no-form'; const sel=f.querySelectorAll('select'); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(sel[0],'03'); sel[0].dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); f.querySelector('input[type=checkbox]').click(); f.querySelector('button[type=submit]').click(); await new Promise(r=>setTimeout(r,2500)); return 'ok'})()`);
  const arrival = getBoard(db, board.id)!.stays[0].expected_arrival;
  before = outboxCount();
  alert = await clickApprove();
  record("A06·승인 C (숙소 도착 시각 변경 후 예전 초안)", saved === "ok" && Date.parse(arrival ?? "") === Date.parse("2026-10-20T03:30+09:00") && !!alert && outboxCount() === before, `저장된 도착 ${arrival}, 안내 "${alert}", 발송함 +${outboxCount() - before}`);

  // A09: 김포 출발 보드에서 인천 출발 안내를 고르면 경고
  await goto(390, true);
  const conflict = await js<string>(`(async()=>{const g=document.querySelector('.airport-guide'); g.querySelectorAll('.ag-tab')[1].click(); await new Promise(r=>setTimeout(r,300)); const def=[...g.querySelectorAll('.ag-seg button')].find(b=>b.getAttribute('aria-pressed')==='true')?.textContent; [...g.querySelectorAll('.ag-seg button')].find(b=>b.textContent.startsWith('Incheon')).click(); await new Promise(r=>setTimeout(r,300)); return def+' | '+(g.querySelector('.ag-warn')?.textContent ?? '')})()`);
  record("A09 (출발 공항 충돌)", /Gimpo/.test(conflict) && /leave from Gimpo/.test(conflict), conflict);

  // 화면 안에서 쓰는 도우미: 입력하고, 역 찾기 목록의 첫 역을 고른다
  const HELP = `const w=(ms)=>new Promise(r=>setTimeout(r,ms)); const type=async(el,v)=>{el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true})); await w(300);}; const pick=async(el,v)=>{await type(el,v); el.closest('.station-search').querySelector('.station-results button')?.click(); await w(300);};`;

  // N01·N08: 역 찾기 (역 번호로 찾고 카드에 노선·번호가 나오는지)
  await goto(390, true);
  const find = await js<string>(`(async()=>{${HELP} const t=document.querySelector('.transit'); await pick(t.querySelector('.station-search.is-big input'),'424'); await w(500); return t.querySelector('.station-card')?.innerText.replace(/\\n/g,' ') ?? 'no-card'})()`);
  record("N01 역 찾기 (역 번호 424 → 명동, 노선·번호 카드)", /Myeong-dong/.test(find) && /424/.test(find) && /Line 4/.test(find), find);

  // N08: 390px 경로·키보드 이동·가로 넘침
  const n08 = await js<{ legs: number; moved: boolean; overflow: boolean; note: string }>(`(async()=>{${HELP} const t=document.querySelector('.transit'); const [a,b]=t.querySelectorAll('.transit-fields input'); await pick(a,'김포공항'); await pick(b,'강남'); await w(1500); const svg=t.querySelector('svg'); const vb=svg.getAttribute('viewBox'); svg.focus(); svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})); await w(300); return {legs:t.querySelectorAll('.route-diagram .rd-leg').length, moved: vb!==svg.getAttribute('viewBox'), overflow: document.documentElement.scrollWidth>document.documentElement.clientWidth, note: t.querySelector('.transit-online')?.innerText.slice(0,80) ?? ''}})()`);
  record("N08 (390px 경로·키보드 이동·가로 넘침 없음)", n08.legs > 0 && n08.moved && !n08.overflow, JSON.stringify(n08));
  if (!LIVE) record("N06 (경로 시간·요금: 자격 없음·인증 실패 안내)", /ODsay|refused/.test(n08.note) && !(await js<number>(`document.querySelectorAll('.transit-paths li').length`)), n08.note);

  // N08 한국어
  db.$client.prepare("UPDATE trip_boards SET user_language = 'ko' WHERE id = ?").run(board.id);
  await goto(1280);
  const ko = await js<string>(`(document.querySelector('.transit-area')?.textContent ?? '').slice(0, 5) + ' / ' + document.querySelector('.airport-guide .ag-tab')?.textContent`);
  record("N08 (한국어 화면)", ko === "지원 범위 / 도착", ko);

  // L01: 불어·일본어·중국어 화면에서 역 카드와 경로의 역·노선·방면 이름이 그 언어로 나오는지 (390px, 가로 넘침 없음)
  const localized: Record<string, RegExp[]> = {
    fr: [/Ligne 4/, /Prenez la Ligne/, /direction /, /Aéroport international de Gimpo/],
    ja: [/ミョンドン/, /4号線/, /方面/],
    "zh-CN": [/明洞/, /4号线/, /方向/],
  };
  for (const [language, expected] of Object.entries(localized)) {
    db.$client.prepare("UPDATE trip_boards SET user_language = ? WHERE id = ?").run(language, board.id);
    await goto(390, true);
    const shown = await js<{ text: string; overflow: boolean }>(`(async()=>{${HELP} const t=document.querySelector('.transit'); await pick(t.querySelector('.station-search.is-big input'),'424'); await w(500); const card=t.querySelector('.station-card')?.innerText ?? 'no-card'; const [a,b]=t.querySelectorAll('.transit-fields input'); await pick(a,'명동'); await pick(b,'김포공항'); await w(1200); return {text:(card+' | '+(t.querySelector('.route-diagram')?.innerText ?? 'no-route')).replace(/\\n/g,' '), overflow: document.documentElement.scrollWidth>document.documentElement.clientWidth}})()`);
    record(`L01 (${language} 화면의 역·노선·방면 이름)`, expected.every((re) => re.test(shown.text)) && !shown.overflow, shown.text.slice(0, 160));
  }
  db.$client.prepare("UPDATE trip_boards SET user_language = 'en' WHERE id = ?").run(board.id);

  // N03: 보드의 숙소(가상 호텔)는 지도에 없으므로 "찾지 못함"이어야 하고, 실제 장소 이름은 가까운 역을 고를 수 있어야 한다 (실제 Nominatim 호출)
  await goto(390, true);
  const n03Fake = await js<string>(`(async()=>{const t=document.querySelector('.transit'); const chip=[...t.querySelectorAll('.transit-quick .chip')].find(c=>c.closest('[aria-label="My places"]')); if(!chip) return 'no-place-chip'; chip.click(); for(let k=0;k<40 && !t.querySelector('.place-candidate .chip, .transit-form .ag-warn');k++) await new Promise(r=>setTimeout(r,500)); return t.querySelector('.place-candidate .chip') ? 'found' : (t.querySelector('.transit-form .ag-warn')?.textContent ?? 'nothing')})()`);
  record("N03·N06 (가상 숙소: 좌표를 지어내지 않고 '찾지 못함')", /Couldn't find/.test(n03Fake), n03Fake);
  const n03 = await js<string>(`(async()=>{${HELP} const t=document.querySelector('.transit'); const [a,b]=t.querySelectorAll('.transit-fields input'); await type(a,'Myeongdong Cathedral'); const ask=a.closest('.station-search').querySelector('.sr-place'); if(!ask) return 'no-search-button'; ask.click(); await w(800); for(let k=0;k<40 && !t.querySelector('.place-candidate .chip, .transit-form .ag-warn');k++) await w(500); const st=t.querySelector('.place-candidate .chip'); if(!st) return 'no-candidates: '+(t.querySelector('.transit-form .ag-warn')?.textContent ?? ''); const picked=st.textContent; st.click(); await w(200); await pick(b,'강남'); await w(1200); return picked+' | '+(t.querySelector('.transit-walk')?.textContent ?? 'no-walk')})()`);
  record("N03 (입력한 장소 → 지도 검색 좌표 → 가까운 역 → 경로)", /Walk from Myeongdong Cathedral/.test(n03) || /Walk from .* to /.test(n03), n03);

  // A07: 실시간 운항 (공공데이터 키 없음 → 공식 안내)
  const live = await js<string>(`(async()=>{const g=document.querySelector('.airport-guide'); g.querySelectorAll('.ag-tab')[0].click(); await new Promise(r=>setTimeout(r,300)); const b=g.querySelector('.live-status button'); if(!b) return 'no-button: '+(g.querySelector('.live-status, .ag-note')?.textContent ?? ''); b.click(); await new Promise(r=>setTimeout(r,1500)); return b.textContent+' | '+(g.querySelector('.live-status [role=status]')?.textContent ?? '')})()`);
  // 키가 없으면 "키 필요", 키가 있으면 데모 항공편(10-20)은 "운항 당일만" 안내가 맞다. 어느 쪽이든 가짜 탑승구·벨트가 없어야 한다
  record("A07 (실시간 운항: 키 없음·운항 당일 아님 안내, 가짜 정보 없음)", /open data key|day of the flight/.test(live) && !(await js<number>(`document.querySelectorAll('.live-grid').length`)), live);

  // B07: 날짜가 겹치는 숙소가 있으면 숙소 칸에 경고
  const first = getBoard(db, board.id)!.stays[0];
  db.$client
    .prepare("INSERT INTO stays (id, board_id, name, check_in_date, check_out_date, field_sources) VALUES ('stay_overlap_test', ?, 'Overlap Test Stay', ?, ?, '{}')")
    .run(board.id, first.check_in_date, first.check_out_date);
  await goto(1280);
  const overlap = await js<string>(`[...document.querySelectorAll('.sign .ag-warn')].map(p=>p.textContent).find(t=>t.includes('Overlap Test Stay')) ?? ''`);
  record("B07 (숙소 날짜 겹침 경고)", overlap.includes(first.name) && overlap.includes("Overlap Test Stay"), overlap);
  db.$client.prepare("DELETE FROM stays WHERE id = 'stay_overlap_test'").run();

  // F2-B1: 채팅에 "Help!"만 → AI를 부르지 않고 긴급 번호와 함께 위험한지 묻는다 (LLM 호출 없음)
  await goto(390, true);
  const sendChat = (text: string, waitFor: string, seconds: number) =>
    js<string>(`(async()=>{const i=document.querySelector('.desk-input input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(text)}); i.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.desk-input button[type=submit]').click(); for(let k=0;k<${seconds} && !document.querySelector('${waitFor}');k++) await new Promise(r=>setTimeout(r,1000)); await new Promise(r=>setTimeout(r,500)); const card=document.querySelector('.say-safety:last-of-type .safety-card'); return JSON.stringify({safety: card?.querySelector('.safety-title')?.textContent ?? '', numbers: [...(card?.querySelectorAll('.safety-digits') ?? [])].map(n=>n.textContent).join(','), action: !!document.querySelector('.action-card'), last: [...document.querySelectorAll('.say-assistant p, .say-error p')].at(-1)?.textContent?.slice(0,120) ?? ''})})()`);
  const help = JSON.parse(await sendChat("Help!", ".say-safety", 15));
  record("F2-B1 ('Help!' → 위험 확인 + 112·119·1330, AI 호출 없음)", /danger/i.test(help.safety) && help.numbers.includes("112") && help.numbers.includes("119"), JSON.stringify(help));

  // F2-B3: 호텔 도착을 비행기 착륙(00:40)보다 이르게 고르면 경고와 추가 확인이 나온다
  await goto(1280);
  const early = await js<string>(`(async()=>{const f=document.querySelector('.ag-hotel'); if(!f) return 'no-form'; const sel=f.querySelectorAll('select'); const set=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; set.call(sel[0],'00'); sel[0].dispatchEvent(new Event('change',{bubbles:true})); set.call(sel[1],'00'); sel[1].dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,400)); return JSON.stringify({landing: f.innerText.includes('Scheduled landing'), warn: f.querySelector('.ag-warn')?.textContent ?? '', extra: !!f.querySelector('[name=confirm_before_landing]')})})()`);
  const e = JSON.parse(early === "no-form" ? "{}" : early);
  record("F2-B3 (착륙보다 이른 호텔 도착 → 경고·추가 확인)", !!e.landing && /before your flight lands/.test(e.warn ?? "") && e.extra === true, early);

  // --live: 실제 ODsay로 지하철 경로의 시간·요금·막차가 화면에 나오는지
  if (LIVE) {
    await goto(390, true);
    const liveRoute = await js<string>(`(async()=>{const t=document.querySelector('.transit'); const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}))}; const [a,b]=t.querySelectorAll('.transit-fields input'); const w=(ms)=>new Promise(r=>setTimeout(r,ms)); const pick=async(el,v)=>{el.focus(); set(el,v); await w(300); el.closest('.station-search').querySelector('.station-results button')?.click(); await w(300);}; await pick(a,'인천공항1터미널'); await pick(b,'명동'); for(let k=0;k<40 && !t.querySelector('.transit-paths li, .transit-online [role=status]');k++) await new Promise(r=>setTimeout(r,500)); return JSON.stringify({paths: t.querySelectorAll('.transit-paths > li').length, first: t.querySelector('.transit-paths .transit-summary')?.innerText.replace(/\\n/g,' ') ?? '', last: t.querySelector('.last-train-head')?.textContent ?? '', status: t.querySelector('.transit-online [role=status]')?.textContent ?? ''})})()`);
    const r = JSON.parse(liveRoute);
    record("N02·N04 실제 ODsay 경로 (시간·요금·막차)", r.paths > 0 && !!r.last, liveRoute);
  } else {
    say("- 미실행 실제 ODsay 경로 (--live 없이 실행: 키를 비운 상태로 안내만 확인)");
  }

  await goto(390, true);
  const airportTime = await js<{ warning: boolean; notice: boolean; paths: number; overflow: boolean }>(`(async()=>{${HELP} const t=document.querySelector('.transit'); const [a,b]=t.querySelectorAll('.transit-fields input'); await pick(a,'인천공항1터미널'); await pick(b,'명동'); await w(300); const i=t.querySelector('.airport-departure input[type="datetime-local"]'); await type(i,'2026-10-20T00:10'); await w(300); const warning=!!t.querySelector('.airport-departure .ag-warn'); t.querySelector('.airport-departure input[type=checkbox]').click(); await w(200); return {warning, notice: /unverified/.test(t.querySelector('.transit-online')?.textContent ?? ''), paths:t.querySelectorAll('.transit-paths > li').length, overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
  record("F2-B7 (공항 출발 시각·착륙 전 경고·운행 미검증, 390px)", airportTime.warning && airportTime.notice && airportTime.paths === 0 && !airportTime.overflow, JSON.stringify(airportTime));
  if (!LIVE) {
    const scheduled = await js<{ gated: boolean; unconfigured: boolean; reset: boolean; holidayReset: boolean; overflow: boolean }>(`(async()=>{${HELP} const t=document.querySelector('.transit'); const i=t.querySelector('.airport-departure input[type="datetime-local"]'); await type(i,'2026-10-20T21:00'); await w(300); const boxes=t.querySelectorAll('.airport-departure input[type=checkbox]'); const gated=!boxes[0].checked && t.querySelectorAll('.transit-paths > li').length===0; boxes[0].click(); for(let k=0;k<30 && !/isn't connected/.test(t.querySelector('.transit-online')?.textContent ?? '');k++) await w(100); const unconfigured=/isn't connected/.test(t.querySelector('.transit-online')?.textContent ?? ''); await type(i,'2026-10-20T22:00'); await w(300); const reset=!boxes[0].checked && !/isn't connected/.test(t.querySelector('.transit-online')?.textContent ?? ''); boxes[0].click(); await w(300); boxes[1].click(); await w(300); return {gated,unconfigured,reset,holidayReset:!boxes[0].checked,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};})()`);
    record("F2-B8 (시각 지정 조회·키 미설정·시각/공휴일 변경 재확인)", scheduled.gated && scheduled.unconfigured && scheduled.reset && scheduled.holidayReset && !scheduled.overflow, JSON.stringify(scheduled));
  }

  // C05·C06·C08: 실제 LLM 채팅 1턴 (선택)
  if (process.argv.includes("--chat")) {
    await goto(390, true);
    const chat = await js<string>(`(async()=>{window.__opens=[]; window.open=(u)=>{const tab={opener:{},location:{href:''}}; window.__opens.push(tab); return tab}; const i=document.querySelector('.desk-input input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Take me to Catchtable in English for Test Restaurant, Test Branch, on 2026-10-25 at 19:00 for 2 people.'); i.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.desk-input button[type=submit]').click(); for(let k=0;k<120 && !document.querySelector('.action-card');k++) await new Promise(r=>setTimeout(r,1000)); await new Promise(r=>setTimeout(r,500)); return JSON.stringify({card: !!document.querySelector('.action-card'), opens: window.__opens.map(t=>t.location.href), opener: window.__opens.map(t=>t.opener), opened: document.querySelector('.action-opened')?.textContent ?? ''})})()`);
    const c = JSON.parse(chat);
    record("C05 (새 탭 1회, opener 끊음)", c.card && c.opens.length === 1 && c.opens[0] === "https://www.catchtable.net/" && c.opener[0] === null && !!c.opened, chat);
    await cdp("Page.reload");
    await sleep(3000);
    const again = await js<string>(`(async()=>{window.__opens=[]; window.open=()=>{window.__opens.push(1); return null}; await new Promise(r=>setTimeout(r,1500)); return JSON.stringify({card: !!document.querySelector('.action-card'), opens: window.__opens.length, overflow: document.documentElement.scrollWidth>document.documentElement.clientWidth})})()`);
    const a = JSON.parse(again);
    record("C06·C08 (새로고침 뒤 다시 열지 않음, 카드 유지, 390px 가로 넘침 없음)", a.card && a.opens === 0 && !a.overflow, again);
    // F2-B4: 연결 카드에서 이용자가 결과("예약했어요")를 고르면 이용자 기록으로 남고 새로고침해도 유지된다
    const rec = await js<string>(`(async()=>{const card=document.querySelector('.action-card.is-catchtable'); const b=[...(card?.querySelectorAll('.action-result button') ?? [])].find(x=>/Booked/.test(x.textContent)); if(!b) return JSON.stringify({button:false}); card.querySelector('.action-result input[type=checkbox]')?.click(); await new Promise(r=>setTimeout(r,100)); b.click(); await new Promise(r=>setTimeout(r,1500)); return JSON.stringify({button:true, pressed: b.getAttribute('aria-pressed'), note: [...card.querySelectorAll('.action-result .action-note')].map(x=>x.textContent).join(' ')})})()`);
    await cdp("Page.reload");
    await sleep(3500);
    const kept = await js<string>(`[...(document.querySelector('.action-card.is-catchtable')?.querySelectorAll('.action-result button') ?? [])].find(x=>/Booked/.test(x.textContent))?.getAttribute('aria-pressed') ?? 'none'`);
    const r4 = JSON.parse(rec);
    const events = db.$client.prepare("SELECT COUNT(*) AS n FROM events WHERE detail LIKE '%external_result%'").get() as { n: number };
    record("F2-B4 (외부 사이트 결과를 이용자 기록으로 남김, 새로고침 뒤 유지)", r4.button && r4.pressed === "true" && /own note/.test(r4.note) && kept === "true" && events.n >= 1, JSON.stringify({ ...r4, kept, events: events.n }));

    // F2-B2: 검토에서 긴급으로 오탐된 문장 → 긴급 카드 없이 Booking.com 연결 카드 (실제 LLM 1턴)
    await goto(390, true);
    // 앞 검사의 Catchtable 카드가 같은 화면에 남아 있으므로, 보낸 뒤 Booking.com 카드나 안전 카드가 "새로" 생기는지로 판정한다
    const book = await js<string>(`(async()=>{const count=(sel,re)=>[...document.querySelectorAll(sel)].filter(c=>!re||re.test(c.textContent)).length; const b0=count('.action-card',/Booking\\.com/), s0=count('.say-safety'), m0=count('.say-assistant, .say-error'); const i=document.querySelector('.desk-input input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Please help me book a NEW hotel in Seoul from 2026-10-25 to 2026-10-27, 2 adults, 1 room.'); i.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.desk-input button[type=submit]').click(); for(let k=0;k<120 && count('.action-card',/Booking\\.com/)===b0 && count('.say-safety')===s0 && count('.say-assistant, .say-error')===m0;k++) await new Promise(r=>setTimeout(r,1000)); await new Promise(r=>setTimeout(r,800)); return JSON.stringify({newBooking: count('.action-card',/Booking\\.com/)-b0, newSafety: count('.say-safety')-s0, last: [...document.querySelectorAll('.say-assistant p, .say-error p')].at(-1)?.textContent?.slice(0,120) ?? ''})})()`);
    const bk = JSON.parse(book);
    record("F2-B2 ('Please help me book a NEW hotel…' → 긴급 오탐 없음, Booking.com 연결)", bk.newSafety === 0 && bk.newBooking > 0, book);
  } else {
    say("- 미실행 C05·C06·C08 브라우저 채팅 경로 (--chat 없이 실행)");
  }
}

main()
  .catch((error) => record("실행", false, error instanceof Error ? error.message : String(error)))
  .finally(() => {
    say("");
    say(`요약: 통과 ${results.filter((r) => r.ok).length} / ${results.length}`);
    const file = saveRunLog("browser", log, info.runId);
    console.log(`기록: ${file}`);
    try {
      ws?.close();
    } catch {
      // 이미 닫힘
    }
    chrome?.kill();
    server?.kill();
    try {
      rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    } catch {
      // Chrome이 아직 파일을 쓰고 있으면 임시 폴더는 운영체제가 정리한다
    }
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  });
