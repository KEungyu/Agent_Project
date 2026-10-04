import { loadRequestTypes } from "../request-types/loader";
import type { RequestType } from "../request-types/schema";
import { openRestaurantBooking, prepareStayBooking } from "./booking-tools";
import { createRequestTools } from "./request-tools";
import { boardGet, boardUpdate, type AgentTool } from "./tools";

// 에이전트가 쓸 수 있는 도구 목록. 요청 유형은 data/request-types에서 읽는다.
export function createTools(types: RequestType[] = loadRequestTypes().types): AgentTool[] {
  return [boardGet, boardUpdate, ...createRequestTools(types), prepareStayBooking, openRestaurantBooking];
}
