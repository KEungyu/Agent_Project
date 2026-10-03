// 보여주기 카드의 한국어 문장 (PRD F-11, BACKLOG P2-1). 화면을 보는 사람(기사님·직원)이 읽는 글이라 항상 한국어로 크게 쓴다.
// 이용자가 무슨 뜻인지 알 수 있게 각 문장의 번역은 messages.show에 둔다.

export const DIET_KEYS = ["vegetarian", "vegan", "halal", "noPork", "noBeef", "noSeafood", "nuts", "shellfish", "notSpicy"] as const;
export type DietKey = (typeof DIET_KEYS)[number];

export const DIET_KO: Record<DietKey, string> = {
  vegetarian: "저는 채식을 해요. 고기, 생선, 고기 육수는 빼 주세요.",
  vegan: "저는 비건이에요. 고기, 생선, 달걀, 우유, 젓갈은 빼 주세요.",
  halal: "할랄 음식만 먹어요. 돼지고기와 술은 빼 주세요.",
  noPork: "돼지고기는 빼 주세요.",
  noBeef: "소고기는 빼 주세요.",
  noSeafood: "해산물은 빼 주세요.",
  nuts: "견과류 알레르기가 있어요. 땅콩, 호두 같은 견과류는 꼭 빼 주세요.",
  shellfish: "갑각류·조개 알레르기가 있어요. 새우, 게, 조개는 꼭 빼 주세요.",
  notSpicy: "맵지 않게 해 주세요.",
};

export const AIRPORT_KO: Record<string, string> = { ICN: "인천공항", GMP: "김포공항", PUS: "김해공항", CJU: "제주공항" };

export const SHOW_KO = {
  taxi: "이 주소로 가 주세요.",
  airport: (airport: string) => `${airport} 국제선 출국장으로 가 주세요.`,
  food: "주문하기 전에 꼭 확인 부탁드려요.",
  thanks: "감사합니다!",
};
