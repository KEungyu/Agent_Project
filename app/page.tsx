import type Anthropic from "@anthropic-ai/sdk";
import { connection } from "next/server";
import { getConversation } from "@/lib/agent/conversation";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";
import { getCurrentBoard } from "@/lib/board/store";
import { getDb } from "@/lib/db/client";
import { loadRequestTypes } from "@/lib/request-types/loader";
import { Chat, type ChatLine } from "./components/Chat";
import { EXECUTION_LEVELS, ExecutionBadge } from "./components/ExecutionBadge";
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
  const { types } = loadRequestTypes();

  return (
    <main className="page">
      <header className="header">
        <div>
          <h1>{APP_NAME}</h1>
          <p className="muted">{APP_TAGLINE}</p>
        </div>
        <div className="legend" aria-label="What each badge means">
          {EXECUTION_LEVELS.map((level) => (
            <ExecutionBadge key={level} level={level} />
          ))}
        </div>
      </header>
      <div className="layout">
        <div className="column">
          <TripPanel board={board} />
          <RequestList requests={board?.requests ?? []} types={types} />
        </div>
        <Chat initialLines={board ? toChatLines(getConversation(board.id)) : []} />
      </div>
    </main>
  );
}
