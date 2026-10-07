// 안전 가드 (ARCHITECTURE §2-2 [0]). 에이전트 루프 앞에서 키워드로 판단한다. LLM을 쓰지 않는다.
// 긴급: 공식 번호를 먼저 보여주고 앱은 대신하지 않는다. 행정(비자·외국인등록 등): 범위 밖으로 1345 안내.
// 오탐을 줄이려고 "경찰서 근처"처럼 위급하지 않은 표현은 넣지 않고, 위급함이 분명한 표현만 둔다.

// check: "Help!"처럼 도움을 청하는 말만 있고 무엇인지 알 수 없을 때. 긴급 번호를 보여 주며 위험한지 한 번 묻는다
export type SafetyVerdict = "emergency" | "check" | "out_of_scope" | "ok";

// 라틴 문자 표현: 단어 경계로 찾는다
const EMERGENCY_LATIN = [
  // en ("help me"는 "help me book a hotel" 같은 일반 부탁에도 쓰여 넣지 않는다. 단독이면 아래 CHECK_ONLY)
  "emergency", "i'm hurt", "i am hurt", "injured", "bleeding", "accident", "ambulance", "on fire",
  "call the police", "robbed", "attacked", "can't breathe", "cannot breathe", "unconscious", "heart attack",
  // vi
  "tai nạn", "bị thương", "cấp cứu", "cháy nhà", "gọi cảnh sát", "chảy máu", "bị cướp",
  // id
  "kecelakaan", "terluka", "ambulans", "kebakaran", "panggil polisi", "berdarah", "darurat", "dirampok",
  // es
  "emergencia", "accidente", "herido", "herida", "ambulancia", "incendio", "llama a la policía", "sangrando", "me robaron",
  // fr
  "urgence", "au secours", "blessé", "blessée", "incendie", "au feu", "appelez la police", "appeler la police",
  "je saigne", "on m'a volé", "agressé", "agressée", "je ne peux pas respirer", "inconscient", "crise cardiaque",
];
// 한·중·일·태국 문자 표현: 부분 문자열로 찾는다
const EMERGENCY_SCRIPT = [
  // ko
  "다쳤", "응급", "살려 주세요", "살려주세요", "사고가 났", "사고 났", "구급차", "불이 났", "불났", "경찰 불러", "강도", "피가 나", "숨을 못", "쓰러졌",
  // ja
  "事故", "怪我", "けがをし", "救急", "火事", "警察を呼", "出血", "強盗", "倒れ",
  // zh (간체·번체)
  "受伤", "受傷", "救护车", "救護車", "着火", "著火", "报警", "報警", "流血", "抢劫", "搶劫", "救命",
  // th
  "อุบัติเหตุ", "บาดเจ็บ", "รถพยาบาล", "ไฟไหม้", "เรียกตำรวจ", "เลือดออก", "ฉุกเฉิน",
];

const ADMIN_LATIN = [
  // "visa" 한 단어는 카드 결제("pay with Visa")와 겹쳐 비자 행정을 뜻하는 표현만 둔다
  "my visa", "a visa", "tourist visa", "visa extension", "extend my visa", "visa application", "visa expires",
  "alien registration", "residence card", "residence permit", "arc card", "immigration office", "work permit",
  "extend my stay", "overstay", "thị thực", "thẻ cư trú", "izin tinggal", "visado", "permiso de residencia",
  "mon visa", "un visa", "prolonger mon visa", "titre de séjour", "carte de séjour", "permis de travail",
];
const ADMIN_SCRIPT = [
  "비자", "외국인등록", "외국인 등록", "체류 연장", "체류기간", "출입국",
  "ビザ", "在留カード", "外国人登録", "签证", "簽證", "居留证", "居留證", "外国人登记", "วีซ่า",
];

// 도움을 청하는 말만 단독으로 온 경우 (문장 부호·"please" 정도만 붙은 것). 긴급인지 알 수 없어 확인한다
const CHECK_ONLY = new Set([
  "help", "help me", "please help", "please help me", "help me please", "help please", "i need help", "sos",
  "도와주세요", "도와줘", "助けて", "助けてください", "帮帮我", "帮我", "请帮帮我",
  "à l'aide", "aidez-moi", "aide-moi", "ayuda", "ayúdame", "ayudenme", "ayúdenme", "tolong", "tolong saya",
  "giúp tôi", "cứu tôi", "ช่วยด้วย", "ช่วยหน่อย",
]);
const bare = (text: string) =>
  text
    .toLowerCase()
    .replace(/[!！¡?？¿.。,，~…\s]+/g, " ")
    .trim();

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const latinPattern = (words: string[]) => new RegExp(`(?<![\\p{L}])(?:${words.map(escape).join("|")})(?![\\p{L}])`, "iu");
const EMERGENCY_RE = latinPattern(EMERGENCY_LATIN);
const ADMIN_RE = latinPattern(ADMIN_LATIN);

export function checkSafety(message: string): SafetyVerdict {
  const text = message.normalize("NFC");
  if (EMERGENCY_RE.test(text) || EMERGENCY_SCRIPT.some((word) => text.includes(word))) return "emergency";
  if (CHECK_ONLY.has(bare(text))) return "check";
  if (ADMIN_RE.test(text) || ADMIN_SCRIPT.some((word) => text.includes(word))) return "out_of_scope";
  return "ok";
}
