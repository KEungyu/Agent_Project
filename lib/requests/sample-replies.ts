import type { ReplyClass } from "../board/types";

// 시연 화면에서 고를 수 있는 가상 회신 (실제 업체 메일이 아니다)
export const SAMPLE_REPLIES: { id: ReplyClass; raw_ko: string }[] = [
  {
    id: "conditional",
    raw_ko:
      "안녕하세요, Emma Smith 고객님. 늦은 체크인은 가능합니다. 다만 프런트가 자정에 문을 닫기 때문에, 도착 당일 오후에 현관 도어락 비밀번호를 이 메일로 보내 드리겠습니다. 조심히 오세요.",
  },
  {
    id: "info_requested",
    raw_ko: "문의 감사합니다. 늦은 체크인 확인을 위해 도착 항공편명과 연락 가능한 휴대전화 번호를 알려 주시겠어요?",
  },
  {
    id: "done",
    raw_ko: "안녕하세요. 저희 프런트는 24시간 운영되니 새벽에 도착하셔도 바로 체크인하실 수 있습니다. 편안한 여행 되세요.",
  },
  {
    id: "declined",
    raw_ko: "죄송하지만 저희 숙소는 보안상 자정 이후에는 출입과 체크인이 불가능합니다. 다음 날 아침 8시 이후에 체크인해 주시기 바랍니다.",
  },
];
