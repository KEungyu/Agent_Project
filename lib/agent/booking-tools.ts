import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getBoard } from "../board/store";
import { checkStayCriteria, nights } from "../booking/criteria";
import { demandConfig } from "../booking/demand";
import { EXTERNAL_PROVIDERS, type ExternalAction } from "../external/links";
import { fmt, getMessages } from "../i18n/messages";
import { formatFullDate } from "../time";
import { defineTool, type ToolContext } from "./tools";

// 새 예약을 외부 예약 화면으로 연결하는 도구. 연결은 예약이 아니다: 마중이는 예약·결제·확정을 하지 않고,
// 사이트에서 직접 입력할 조건을 정리해 검증한 공식 주소로 연결한다.

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const TIME = z.string().regex(/^\d{2}:\d{2}$/, "HH:MM (KST)");

function languageOf({ db, boardId }: ToolContext) {
  return getBoard(db, boardId)?.user_language ?? "en";
}

const kstToday = (now: Date) => new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

export const prepareStayBooking = defineTool({
  name: "prepare_stay_booking",
  description:
    "Help the traveler book a NEW stay that they have not booked yet, on Booking.com. " +
    "Never use this for questions about a stay they already booked (late check-in, luggage, towels): those are requests to that stay. " +
    "Never ask for a booking number. Ask only for what is missing: destination, check-in and check-out dates, adults, rooms (children's ages only if children come). " +
    "Opens Booking.com's official site with a summary of the details to enter there. It does not book anything.",
  endsTurn: true,
  input: z.object({
    destination: z.string().min(1),
    check_in: DATE,
    check_out: DATE,
    adults: z.number().int(),
    rooms: z.number().int(),
    children_ages: z.array(z.number().int()).optional(),
  }),
  run: (input, ctx) => {
    const problems = checkStayCriteria(input, kstToday(ctx.now?.() ?? new Date()));
    if (problems.length > 0) {
      throw new Error(`Cannot prepare this booking: ${problems.join(", ")}. Ask the traveler to correct only these; do not change dates yourself.`);
    }
    const language = languageOf(ctx);
    const m = getMessages(language);
    const a = m.actions;
    const action: ExternalAction = {
      kind: "external_link",
      id: randomUUID(),
      provider: "booking",
      url: EXTERNAL_PROVIDERS.booking.home,
      autoOpen: false,
      status: "site_link",
      // 공식 API 자격이 없으면 공식 웹 첫 화면으로만 연결한다 (검색 조건 자동 입력을 보장하지 않는다)
      mode: "site",
      summary: [
        { label: a.destination, value: input.destination },
        { label: a.checkIn, value: formatFullDate(input.check_in, language) },
        { label: a.checkOut, value: `${formatFullDate(input.check_out, language)} (${fmt(a.nights, { n: nights(input) })})` },
        { label: a.guests, value: `${input.adults}${input.children_ages?.length ? ` + ${input.children_ages.length} (${input.children_ages.join(", ")})` : ""}` },
        { label: a.rooms, value: String(input.rooms) },
      ],
    };
    const api = demandConfig();
    return {
      reply: m.agent.bookingReady,
      action,
      // 모델에게만 보이는 상태: API 자격이 없으면 공식 웹 연결이다
      api_status: api.ok ? "configured (destination lookup not implemented; using site link)" : `not configured (${api.missing.join(", ")})`,
    };
  },
});

export const openRestaurantBooking = defineTool({
  name: "open_restaurant_booking",
  description:
    "Open CatchTable Global (English) when the traveler clearly asks to book a restaurant or to go to a restaurant booking site. " +
    "Do NOT call it for restaurant recommendations, when they say not to book, or for cancelling/changing a reservation. If it is unclear, ask a short question instead. " +
    "If the traveler explicitly wants to email or call a restaurant, use the restaurant_booking request type instead. " +
    "Restaurant, branch, date, time and party size are optional: pass only what the traveler said. It does not book or join a waitlist.",
  endsTurn: true,
  input: z.object({
    restaurant: z.string().optional(),
    branch: z.string().optional(),
    date: DATE.optional(),
    time: TIME.optional(),
    party_size: z.number().int().positive().optional(),
  }),
  run: (input, ctx) => {
    const language = languageOf(ctx);
    const m = getMessages(language);
    const a = m.actions;
    const summary = [
      input.restaurant && { label: a.restaurant, value: input.restaurant },
      input.branch && { label: a.branch, value: input.branch },
      input.date && { label: a.date, value: formatFullDate(input.date, language) },
      input.time && { label: a.time, value: `${input.time} KST` },
      input.party_size && { label: a.party, value: String(input.party_size) },
    ].filter(Boolean) as ExternalAction["summary"];
    const action: ExternalAction = {
      kind: "external_link",
      id: randomUUID(),
      provider: "catchtable",
      // 식당별 페이지는 실제로 확인한 경우에만 쓴다. 지금은 확인한 페이지가 없어 Global 첫 화면으로 연결한다
      url: EXTERNAL_PROVIDERS.catchtable.home,
      autoOpen: true,
      status: "site_link",
      summary,
    };
    return { reply: m.agent.restaurantReady, action };
  },
});
