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

// 약국: 증상을 고르면 약사에게 보여줄 문장이 된다
export const PHARMACY_KEYS = ["headache", "fever", "stomach", "cold", "diarrhea", "allergy", "wound"] as const;
export type PharmacyKey = (typeof PHARMACY_KEYS)[number];
export const PHARMACY_KO: Record<PharmacyKey, string> = {
  headache: "머리가 아파요.",
  fever: "열이 나요.",
  stomach: "배가 아파요.",
  cold: "감기 기운이 있어요. 기침이 나고 목이 아파요.",
  diarrhea: "설사를 해요.",
  allergy: "알레르기 때문에 가렵고 부었어요.",
  wound: "다쳤어요. 밴드와 연고가 필요해요.",
};

// 쇼핑: 가게에서 자주 묻는 말
export const SHOPPING_KEYS = ["taxFree", "card", "size", "tryOn", "bag", "receipt"] as const;
export type ShoppingKey = (typeof SHOPPING_KEYS)[number];
export const SHOPPING_KO: Record<ShoppingKey, string> = {
  taxFree: "택스 프리(즉시 환급) 되나요?",
  card: "카드로 계산할 수 있어요?",
  size: "다른 사이즈 있어요?",
  tryOn: "입어 봐도 돼요?",
  bag: "봉투 하나 주세요.",
  receipt: "영수증 주세요.",
};

export const AIRPORT_KO: Record<string, string> = { ICN: "인천공항", GMP: "김포공항", PUS: "김해공항", CJU: "제주공항" };

// 택시 카드는 "○○까지 가 주세요."만 크게 쓴다. "까지"는 받침과 상관없이 붙어서 어느 이름에도 자연스럽다.
export const SHOW_KO = {
  taxiTo: (place: string) => `${place}까지 가 주세요.`,
  taxiFrom: (place: string) => `출발: ${place}`,
  airportDepartures: "국제선 출국장",
  food: "주문하기 전에 꼭 확인 부탁드려요.",
  pharmacy: "이 증상에 먹을 약을 주세요.",
  shopping: "여쭤볼게요.",
  thanks: "감사합니다!",
};
