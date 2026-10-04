import { realMailConfig } from "@/lib/mail/mailer";
import type Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { getConversation } from "@/lib/agent/conversation";
import { hasTripData } from "@/lib/board/forms";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { isExternalAction, type ExternalAction } from "@/lib/external/links";
import { getLanguage } from "@/lib/i18n/languages";
import { getMessages } from "@/lib/i18n/messages";
import { getLatestReply } from "@/lib/requests/replies";
import { evaluateAlerts } from "@/lib/proactive/rules";
import { loadRequestTypes } from "@/lib/request-types/loader";
import { AlertList } from "./components/AlertList";
import { BasicPhrases } from "./components/BasicPhrases";
import { ArrivalBoard } from "./components/ArrivalBoard";
import { EntryIntro, IntroReplay } from "./components/EntryIntro";
import { kstDate } from "@/lib/time";
import { Toaster } from "./components/Toaster";
import { buildHero } from "@/lib/hero";
import { Chat, type ChatLine } from "./components/Chat";
import { LanguagePicker } from "./components/LanguagePicker";
import { RequestList } from "./components/RequestList";
import { TripPanel } from "./components/TripPanel";

// 대화 기록에서 화면에 보일 문장만 꺼낸다. 도구 호출·결과 블록은 숨기되, 마중이의 답에는
// 그 답을 내기까지 쓴 도구 이름을 붙여 둔다(출구 번호판 표와 "초안 보기" 버튼이 새로 그려도 남게).
function toChatLines(messages: Anthropic.Beta.BetaMessageParam[]): ChatLine[] {
  const lines: ChatLine[] = [];
  let tools: { id: string; name: string; ok: boolean }[] = [];
  let actions: ExternalAction[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const blocks = typeof message.content === "string" ? [{ type: "text" as const, text: message.content }] : message.content;
    for (const block of blocks) {
      if (block.type === "tool_use") tools.push({ id: block.id, name: block.name, ok: true });
      if (block.type === "tool_result" && block.is_error) {
        const used = tools.find((tool) => tool.id === block.tool_use_id);
        if (used) used.ok = false;
      }
      // 도구 결과에 담긴 외부 연결 행동을 되살린다 (다시 그려도 카드가 남고, 자동 열기는 하지 않는다)
      if (block.type === "tool_result" && !block.is_error && typeof block.content === "string") {
        try {
          const action = (JSON.parse(block.content) as { action?: unknown }).action;
          if (isExternalAction(action)) actions.push(action);
        } catch {
          // 행동이 없는 결과
        }
      }
    }
    const text = blocks
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n")
      .trim();
    if (!text) continue;
    lines.push(
      message.role === "assistant"
        ? { role: "assistant", text, tools: tools.map(({ name, ok }) => ({ name, ok })), ...(actions.length ? { actions } : {}) }
        : { role: "user", text },
    );
    tools = [];
    actions = [];
  }
  return lines;
}

export default async function Home() {
  // SQLite는 동기 API라 요청마다 새로 읽도록 렌더링을 요청 시점으로 미룬다
  await connection();
  const db = getDb();
  const board = getCurrentBoard(db);
  const latestReplies = Object.fromEntries((board?.requests ?? []).map((request) => [request.id, getLatestReply(db, request.id)]));
  const language = getLanguage(board?.user_language);
  const m = getMessages(language.code);
  const { types } = loadRequestTypes();
  const now = new Date();
  const alerts = board ? evaluateAlerts(board, now) : [];
  const hero = buildHero(board, alerts, types, m, now);
  const chatLines = board ? toChatLines(getConversation(board.id)) : [];
  // 실제 메일 모드(설정이 모두 있을 때만)면 "시연" 표시를 실제 발송 안내로 바꾼다. 받는 곳은 팀 허용 목록으로만 제한된다
  const realMail = process.env.MAIL_MODE === "real" && realMailConfig().ok;
  // 입국 도장: 입국일(없으면 오늘)과 도착 공항
  const activeRequests = (board?.requests ?? []).some((request) => !["done", "declined"].includes(request.status));
  const requestList = (
    <RequestList requests={board?.requests ?? []} types={types} stays={board?.stays ?? []} latestReplies={latestReplies} m={m} language={language.code} realMail={realMail} />
  );
  const entryDate = (board?.arrival?.datetime ? kstDate(board.arrival.datetime) : kstDate(now.toISOString())).replaceAll("-", ".");

  return (
    <>
      <EntryIntro m={m.intro} ko={getMessages("ko").intro} language={language.code} stamp={{ date: entryDate, airport: board?.arrival?.airport ?? "ICN" }} hasTrip={hasTripData(board)}
        languagePicker={<LanguagePicker current={language} title={m.language} panelId="intro-language-panel" />}
      />
      <header className="signbar">
        <div className="signbar-inner">
          <div className="brand">
            <span className="brand-roundel brand-mascot" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 마스코트 이미지 */}
              <img src="/mascot/majung-head.png" width={44} height={44} alt="" />
            </span>
            <div>
              <p className="brand-name" lang="ko">
                마중이 <span lang="en">Majungi</span>
              </p>
              <p className="brand-tagline">{m.tagline}</p>
            </div>
          </div>
          <a className="ask-link" href="#chat">
            {m.chat.title}
          </a>
          <LanguagePicker current={language} title={m.language} />
        </div>
      </header>
      <main className="platform" key={language.code}>
        <div className="platform-main">
          <ArrivalBoard model={hero} m={m} locale={language.code} realMail={realMail} />
          <AlertList alerts={alerts} m={m} />
          {/* 승인·회신을 기다리는 요청이 있으면 요청 목록을 여행 보드 위로 올려, 마중이가 쓴 메일을 바로 보게 한다 */}
          {activeRequests && requestList}
          <BasicPhrases language={language.code} m={m.phrases} safety={m.safety} />
          <TripPanel board={board} m={m} language={language.code} />
          {!activeRequests && requestList}
        </div>
        {/* 서버에서 대화가 늘어나면(예: 수정 요청) 채팅 창을 새 기록으로 다시 그린다. 언어가 바뀌어도 다시 그린다 */}
        <Chat key={`${language.code}-${chatLines.length}`} initialLines={chatLines} m={m.chat} safety={m.safety} actionsM={m.actions} />
      </main>
      <Toaster />
      <footer className="platform-footer" lang="ko">
        <IntroReplay label={m.intro.replay} />
      </footer>
    </>
  );
}
