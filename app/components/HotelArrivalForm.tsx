"use client";

import { useState } from "react";
import { saveStay } from "@/app/actions";
import { fmt, type Messages } from "@/lib/i18n/messages";
import { DateTimeField } from "./DateField";

// 공항 안내의 "호텔 도착 시각 바꾸기". 착륙·공항 출발·호텔 도착은 다른 시각이다:
// 비행기 착륙 시각을 함께 보여 주고, 호텔 도착을 착륙보다 이르게 넣으면 한 번 더 확인받은 뒤에만 저장한다.
export function HotelArrivalForm({
  stayId,
  stayName,
  defaultValue,
  landing,
  landingText,
  language,
  m,
}: {
  stayId: string;
  stayName: string;
  defaultValue: string;
  landing?: string; // 보드의 항공편 도착 (KST ISO)
  landingText?: string;
  language: string;
  m: Messages;
}) {
  const g = m.airportGuide;
  const [value, setValue] = useState(defaultValue);
  // value는 "YYYY-MM-DDTHH:MM" (KST)
  const beforeLanding = !!landing && !!value && Date.parse(`${value}:00+09:00`) < Date.parse(landing);
  return (
    <form action={saveStay} className="ag-hotel">
      <p className="ag-hotel-title">{g.hotelTitle}</p>
      <p className="ag-note">
        {stayName} · {g.hotelBody}
      </p>
      {landingText && <p className="ag-note">{fmt(g.hotelLanding, { time: landingText })}</p>}
      <input type="hidden" name="stay_id" value={stayId} />
      <DateTimeField name="expected_arrival" defaultValue={defaultValue} language={language} labels={m.date} ariaLabel={g.hotelTitle} onValueChange={setValue} />
      {beforeLanding && (
        <>
          <p className="ag-warn" role="status">
            {fmt(g.hotelBeforeLanding, { time: landingText ?? "" })}
          </p>
          <label className="ag-confirm">
            <input type="checkbox" name="confirm_before_landing" required />
            {g.hotelBeforeLandingConfirm}
          </label>
        </>
      )}
      <label className="ag-confirm">
        <input type="checkbox" name="confirm_arrival" required />
        {g.hotelConfirm}
      </label>
      <button type="submit" className="button-quiet">
        {g.hotelSave}
      </button>
      <p className="ag-note">{g.hotelNote}</p>
    </form>
  );
}
