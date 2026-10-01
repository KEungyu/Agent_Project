import type Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { getConversation } from "@/lib/agent/conversation";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { getLanguage } from "@/lib/i18n/languages";
import { getMessages } from "@/lib/i18n/messages";
import { loadRequestTypes } from "@/lib/request-types/loader";
import { Chat, type ChatLine } from "./components/Chat";
import { EXECUTION_LEVELS, ExecutionBadge } from "./components/ExecutionBadge";
import { LanguagePicker } from "./components/LanguagePicker";
import { RequestList } from "./components/RequestList";
import { TripPanel } from "./components/TripPanel";

// 대화 기록에서 화면에 보일 문장만 꺼낸다 (도구 호출·결과 블록은 숨긴다)
function toChatLines(messages: Anthropic.Beta.BetaMessageParam[]): ChatLine[] {
  return messages.flatMap((message): ChatLine[] => {
    if (message.role === "system") return [];
    if (typeof message.content === "string") return [{ role: message.role, text: message.content }];
    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n")
      .trim();
    return text ? [{ role: message.role, text }] : [];
  });
}

export default async function Home() {
  // SQLite는 동기 API라 요청마다 새로 읽도록 렌더링을 요청 시점으로 미룬다
  await connection();
  const board = getCurrentBoard(getDb());
  const language = getLanguage(board?.user_language);
  const m = getMessages(language.code);
  const { types } = loadRequestTypes();
  const chatLines = board ? toChatLines(getConversation(board.id)) : [];

  return (
    <>
      <header className="signbar">
        <div className="signbar-inner">
          <div className="brand">
            <span className="brand-roundel" aria-hidden="true" lang="ko">
              마
            </span>
            <div>
              <p className="brand-name" lang="ko">
                마중 <span lang="en">Majung</span>
              </p>
              <p className="brand-tagline">{m.tagline}</p>
            </div>
          </div>
          <ul className="legend">
            {EXECUTION_LEVELS.map((level) => (
              <li key={level}>
                <ExecutionBadge level={level} m={m} />
              </li>
            ))}
          </ul>
          <a className="ask-link" href="#chat">
            {m.chat.title}
          </a>
          <LanguagePicker current={language} title={m.language} />
        </div>
      </header>
      <main className="platform">
        <div className="platform-main">
          <TripPanel board={board} m={m} language={language.code} />
          <RequestList requests={board?.requests ?? []} types={types} stays={board?.stays ?? []} m={m} language={language.code} />
        </div>
        {/* 서버에서 대화가 늘어나면(예: 수정 요청) 채팅 창을 새 기록으로 다시 그린다. 언어가 바뀌어도 다시 그린다 */}
        <Chat key={`${language.code}-${chatLines.length}`} initialLines={chatLines} m={m.chat} />
      </main>
    </>
  );
}
