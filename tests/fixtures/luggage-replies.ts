import type { ReplyClass } from "../../lib/board/types";

// 짐 보관 회신 가상 픽스처 (실제 업체 메일이 아니다)
export const LUGGAGE_REPLIES: { label: ReplyClass; raw_ko: string }[] = [
  { label: "done", raw_ko: "네, 체크아웃 후 프런트에서 짐을 무료로 보관해 드립니다. 찾으러 오실 때 성함만 말씀해 주세요." },
  { label: "conditional", raw_ko: "보관은 가능하지만 오후 6시까지만 가능하며, 한 개당 3천 원의 보관료가 있습니다." },
  { label: "declined", raw_ko: "죄송하지만 현재 보관 공간이 부족하여 체크아웃 후 짐 보관이 어렵습니다." },
  { label: "info_requested", raw_ko: "짐의 크기를 알려 주시겠어요? 큰 캐리어는 보관 위치가 다릅니다." },
];
