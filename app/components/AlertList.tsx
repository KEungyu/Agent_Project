"use client";

import { useState, useTransition } from "react";
import { dismissAlertAction, sendChat } from "@/app/actions";
import type { Messages } from "@/lib/i18n/messages";
import type { Alert } from "@/lib/proactive/rules";
import { ExecutionBadge } from "./ExecutionBadge";
import { SignTitle } from "./SignTitle";

// 먼저 챙겨주기: 보드를 점검해 빠진 일을 먼저 알린다. "처리하기"는 그 요청을 마중에게 채팅으로 보낸다.
export function AlertList({ alerts, m }: { alerts: Alert[]; m: Messages }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  if (alerts.length === 0) return null;

  const handle = (alert: Alert) =>
    startTransition(async () => {
      document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" });
      const result = await sendChat(alert.action);
      setError(result.ok ? undefined : result.error);
    });

  return (
    <section className="sign alerts" aria-labelledby="alerts-heading">
      <SignTitle as="h3" id="alerts-heading" ko="먼저 챙길 일" text={m.proactive.title} />
      <ul className="alert-rows">
        {alerts.map((alert) => (
          <li key={`${alert.rule_id}-${alert.target_id}`} className={`alert-row priority-${alert.priority}`}>
            <ExecutionBadge level={alert.level} m={m} />
            <p className="alert-message">{alert.message}</p>
            <div className="alert-actions">
              <button type="button" className="button" disabled={pending} onClick={() => handle(alert)}>
                {m.proactive.handle}
              </button>
              <button
                type="button"
                className="button-quiet"
                disabled={pending}
                onClick={() => startTransition(() => dismissAlertAction(alert.rule_id, alert.target_id))}
              >
                {m.proactive.dismiss}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
