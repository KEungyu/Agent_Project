import type { LanguageCode } from "../i18n/languages";

// 인천·김포 공항 이용 안내 (도착·출발·환승의 수속 단계, 시설, 교통 연결).
// 사실은 공식 페이지에서 확인한 범위만 담고, 항목마다 출처 URL·확인 날짜·적용 터미널을 남긴다.
// 실시간 정보(탑승구·수하물 벨트·지연)는 연동이 없어 다루지 않는다: 화면은 공식 조회 경로만 안내한다.
// 확인하지 못한 운영시간·위치는 넣지 않는다(빈 값 = 미확인).

type L = Record<LanguageCode, string>;
export type AirportCode = "ICN" | "GMP";
// 인천은 제1·제2 여객터미널, 김포는 국내선·국제선 청사. 김포에 T1/T2를 쓰지 않는다
export type Terminal = "T1" | "T2" | "international" | "domestic";
export type Stage = "arrival" | "departure" | "transfer";
export type Source = { url: string; checkedAt: string; covers: string };

const CHECKED = "2026-10-04";
export const SOURCES = {
  icnArrival: { url: "https://www.airport.kr/ap_en/1439/subview.do", checkedAt: CHECKED, covers: "ICN arrival procedure" },
  icnDeparture: { url: "https://www.airport.kr/ap_en/1413/subview.do", checkedAt: CHECKED, covers: "ICN departure procedure" },
  icnFacilities: { url: "https://www.airport.kr/ap_en/1536/subview.do", checkedAt: CHECKED, covers: "ICN Terminal 1 facilities" },
  icnRail: { url: "https://www.airport.kr/ap_en/1512/subview.do", checkedAt: CHECKED, covers: "ICN airport railroad" },
  gmpTransport: { url: "https://www.airport.co.kr/gimpo/cms/frCon/index.do?CONTENTS_NO=2&MENU_ID=1290", checkedAt: CHECKED, covers: "GMP shuttle bus" },
  gmpSubway: { url: "https://www.airport.co.kr/gimpo/cms/frCon/index.do?MENU_ID=1290&CONTENTS_NO=4", checkedAt: CHECKED, covers: "GMP rail lines" },
  gmpFacilities: { url: "https://www.airport.co.kr/gimpo/cms/frCon/index.do?CONTENTS_NO=2&MENU_ID=2390", checkedAt: CHECKED, covers: "GMP facilities" },
} satisfies Record<string, Source>;

export const AIRPORT_TERMINALS: Record<AirportCode, Terminal[]> = { ICN: ["T1", "T2"], GMP: ["international", "domestic"] };

export type Step = { text: L; source?: Source; note?: L };

const t = (en: string, ja: string, zhCN: string, fr: string, vi: string, th: string, id: string, es: string, ko: string): L => ({
  en,
  ja,
  "zh-CN": zhCN,
  fr,
  vi,
  th,
  id,
  es,
  ko,
});

// 국제선 도착 (인천 공식 도착 절차 순서)
const INTL_ARRIVAL_ICN: Step[] = [
  { text: t("Leave the plane and follow Arrivals signs (arrival gates are on 2F).", "飛行機を降りたら到着の案内に従って進みます（到着ゲートは2階）。", "下飞机后按到达指示走（到达登机口在2楼）。", "En sortant de l'avion, suivez les panneaux Arrivées (les portes d'arrivée sont au 2e étage).", "Xuống máy bay và đi theo biển Arrivals (cửa đến ở tầng 2).", "ลงเครื่องแล้วเดินตามป้าย Arrivals (ประตูขาเข้าอยู่ชั้น 2)", "Turun pesawat dan ikuti papan Arrivals (gerbang kedatangan di lantai 2).", "Al bajar del avión, sigue las señales de llegadas (las puertas de llegada están en la 2.ª planta).", "비행기에서 내려 도착 안내를 따라가요 (도착 게이트는 2층)."), source: SOURCES.icnArrival },
  { text: t("Quarantine, and a customs declaration if you carry items to declare.", "検疫と、申告が必要な物があれば税関申告。", "检疫；如有需要申报的物品，填写海关申报。", "Contrôle sanitaire, et déclaration en douane si vous avez des choses à déclarer.", "Kiểm dịch và khai báo hải quan nếu có hàng cần khai.", "ตรวจโรค และแจ้งศุลกากรถ้ามีของต้องสำแดง", "Karantina, dan deklarasi bea cukai jika membawa barang yang wajib dilaporkan.", "Control sanitario y declaración de aduana si llevas algo que declarar.", "검역, 신고할 물품이 있으면 세관 신고."), source: SOURCES.icnArrival },
  { text: t("Immigration (foreign passport lanes).", "入国審査（外国人用レーン）。", "入境审查（外国人通道）。", "Contrôle d'immigration (files pour passeports étrangers).", "Nhập cảnh (làn hộ chiếu nước ngoài).", "ตรวจคนเข้าเมือง (ช่องสำหรับชาวต่างชาติ)", "Imigrasi (jalur paspor asing).", "Control de inmigración (filas para pasaportes extranjeros).", "입국 심사 (외국인 줄)."), source: SOURCES.icnArrival },
  { text: t("Baggage claim on 1F: find your belt number on the screens.", "1階の手荷物受取所へ。画面でベルト番号を確認します。", "到1楼提取行李，在屏幕上找你的转盘号。", "Récupération des bagages au 1er étage : votre numéro de tapis s'affiche sur les écrans.", "Lấy hành lý ở tầng 1: xem số băng chuyền trên màn hình.", "รับกระเป๋าที่ชั้น 1 ดูหมายเลขสายพานบนจอ", "Ambil bagasi di lantai 1: lihat nomor sabuk di layar.", "Recogida de equipaje en la 1.ª planta: busca tu cinta en las pantallas.", "1층에서 짐 찾기: 화면에서 수하물 벨트 번호를 확인해요."), source: SOURCES.icnArrival },
  { text: t("Customs, then out to the arrival hall on 1F.", "税関を通って1階の到着ロビーへ。", "过海关后到1楼到达大厅。", "Douane, puis sortie vers le hall des arrivées au 1er étage.", "Qua hải quan rồi ra sảnh đến ở tầng 1.", "ผ่านศุลกากรแล้วออกสู่โถงขาเข้าชั้น 1", "Lewat bea cukai, lalu keluar ke aula kedatangan di lantai 1.", "Aduana y salida al vestíbulo de llegadas de la 1.ª planta.", "세관을 지나 1층 입국장으로 나가요."), source: SOURCES.icnArrival },
];

// 국제선 출발 (인천 공식 출발 절차 순서)
const INTL_DEPARTURE_ICN: Step[] = [
  { text: t("Go to the departures floor (3F) of your terminal.", "出発ターミナルの3階出発フロアへ。", "去所在航站楼的3楼出发层。", "Allez à l'étage des départs (3e étage) de votre terminal.", "Lên tầng khởi hành (tầng 3) của nhà ga bạn đi.", "ไปชั้นขาออก (ชั้น 3) ของอาคารที่คุณใช้", "Pergi ke lantai keberangkatan (lantai 3) terminalmu.", "Ve a la planta de salidas (3.ª) de tu terminal.", "내 터미널의 3층 출국장으로 가요."), source: SOURCES.icnDeparture },
  { text: t("Check in and drop your bags at your airline's counter.", "航空会社のカウンターでチェックインと手荷物預け。", "在航空公司柜台办理登机和托运。", "Faites l'enregistrement et déposez vos bagages au comptoir de votre compagnie.", "Làm thủ tục và ký gửi hành lý ở quầy hãng bay.", "เช็กอินและโหลดกระเป๋าที่เคาน์เตอร์สายการบิน", "Check-in dan titip bagasi di konter maskapai.", "Facturación y entrega de equipaje en el mostrador de tu aerolínea.", "항공사 카운터에서 체크인하고 짐을 부쳐요."), source: SOURCES.icnDeparture },
  { text: t("Customs or tax-refund declarations, if you need them, before security.", "必要なら保安検査の前に税関申告・免税手続き。", "如有需要，安检前办理海关申报或退税。", "Déclaration en douane ou détaxe, si besoin, avant le contrôle de sécurité.", "Khai hải quan hoặc hoàn thuế (nếu cần) trước khi qua an ninh.", "แจ้งศุลกากรหรือขอคืนภาษี (ถ้ามี) ก่อนตรวจค้น", "Deklarasi bea cukai atau pengembalian pajak (jika perlu) sebelum pemeriksaan keamanan.", "Declaraciones de aduana o devolución de impuestos, si hacen falta, antes del control.", "필요하면 보안검색 전에 세관 신고·세금 환급."), source: SOURCES.icnDeparture },
  { text: t("Security screening.", "保安検査。", "安全检查。", "Contrôle de sécurité.", "Kiểm tra an ninh.", "ตรวจค้นความปลอดภัย", "Pemeriksaan keamanan.", "Control de seguridad.", "보안 검색."), source: SOURCES.icnDeparture },
  { text: t("Departure immigration. After this you can't go back to the public area.", "出国審査。ここを通ると一般エリアには戻れません。", "出境审查。过了这里就不能回到公共区域。", "Contrôle d'immigration au départ. Après, vous ne pouvez plus revenir dans la zone publique.", "Xuất cảnh. Qua đây rồi thì không quay lại khu công cộng được.", "ตรวจคนเข้าเมืองขาออก ผ่านแล้วกลับออกมาโซนทั่วไปไม่ได้", "Imigrasi keberangkatan. Setelah ini kamu tidak bisa kembali ke area umum.", "Control de salida. Después ya no puedes volver a la zona pública.", "출국 심사. 통과하면 일반 구역으로 돌아갈 수 없어요."), source: SOURCES.icnDeparture },
  {
    text: t("Go to your gate and be there 30–40 minutes before boarding.", "搭乗開始の30〜40分前には搭乗口へ。", "登机前30–40分钟到登机口。", "Allez à votre porte et soyez-y 30 à 40 minutes avant l'embarquement.", "Có mặt ở cửa ra máy bay 30–40 phút trước giờ lên máy bay.", "ไปถึงประตูขึ้นเครื่องก่อนเวลาขึ้นเครื่อง 30–40 นาที", "Tiba di gerbang 30–40 menit sebelum boarding.", "Llega a tu puerta 30–40 minutos antes del embarque.", "탑승 30~40분 전까지 탑승구로 가요."),
    source: SOURCES.icnDeparture,
    note: t("Check-in and boarding deadlines are set by your airline for your flight.", "チェックインと搭乗の締め切りは航空会社・便ごとに決まります。", "值机和登机截止时间以航空公司和航班为准。", "Les heures limites d'enregistrement et d'embarquement dépendent de votre compagnie et de votre vol.", "Hạn làm thủ tục và lên máy bay do hãng bay quy định cho chuyến của bạn.", "เวลาปิดเช็กอินและขึ้นเครื่องขึ้นกับสายการบินและเที่ยวบิน", "Batas check-in dan boarding ditentukan maskapai untuk penerbanganmu.", "Los cierres de facturación y embarque los fija tu aerolínea para tu vuelo.", "체크인·탑승 마감은 항공사와 항공편마다 달라요."),
  },
];

// 국내선: 출입국 심사가 없다
const DOMESTIC_ARRIVAL: Step[] = [
  { text: t("No immigration on domestic flights.", "国内線に入国審査はありません。", "国内航班没有入境审查。", "Pas d'immigration sur les vols intérieurs.", "Chuyến nội địa không có thủ tục nhập cảnh.", "เที่ยวบินในประเทศไม่มีตรวจคนเข้าเมือง", "Penerbangan domestik tidak ada imigrasi.", "En vuelos nacionales no hay control de inmigración.", "국내선은 입국 심사가 없어요.") },
  { text: t("Pick up your bags, then exit to arrivals.", "手荷物を受け取って到着ロビーへ。", "取行李后出到到达大厅。", "Récupérez vos bagages, puis sortez vers les arrivées.", "Lấy hành lý rồi ra sảnh đến.", "รับกระเป๋าแล้วออกสู่โถงขาเข้า", "Ambil bagasi, lalu keluar ke kedatangan.", "Recoge el equipaje y sal a llegadas.", "짐을 찾고 도착장으로 나가요.") },
];
const DOMESTIC_DEPARTURE: Step[] = [
  { text: t("Check in at the domestic terminal and drop bags.", "国内線ターミナルでチェックインと手荷物預け。", "在国内航站楼办理登机和托运。", "Enregistrez-vous au terminal intérieur et déposez vos bagages.", "Làm thủ tục và ký gửi ở nhà ga nội địa.", "เช็กอินและโหลดกระเป๋าที่อาคารในประเทศ", "Check-in dan titip bagasi di terminal domestik.", "Factura en la terminal nacional.", "국내선 청사에서 체크인하고 짐을 부쳐요.") },
  { text: t("Security screening with your ID, then go to your gate. No immigration.", "身分証を見せて保安検査、搭乗口へ。出国審査はありません。", "出示证件过安检后去登机口。没有出境审查。", "Contrôle de sécurité avec votre pièce d'identité, puis direction votre porte. Pas d'immigration.", "Qua an ninh (xuất trình giấy tờ) rồi tới cửa ra máy bay. Không có xuất cảnh.", "ตรวจค้นพร้อมแสดงบัตร แล้วไปประตูขึ้นเครื่อง ไม่มีตรวจคนเข้าเมือง", "Pemeriksaan keamanan dengan identitas, lalu ke gerbang. Tanpa imigrasi.", "Control de seguridad con documento y a la puerta. Sin inmigración.", "신분증 확인과 보안 검색 후 탑승구로. 출국 심사는 없어요.") },
];
// 환승 (인천): 연결편 탑승은 보장할 수 없다
const TRANSFER_ICN: Step[] = [
  { text: t("Connecting to another international flight: follow Transfer signs instead of going through immigration.", "国際線の乗り継ぎは入国審査に進まず、Transferの案内に従います。", "转乘国际航班：不要去入境审查，按Transfer指示走。", "Correspondance vers un autre vol international : suivez les panneaux Transfer au lieu de passer l'immigration.", "Nối chuyến quốc tế: đi theo biển Transfer, không qua nhập cảnh.", "ต่อเครื่องระหว่างประเทศ: เดินตามป้าย Transfer ไม่ต้องผ่านตรวจคนเข้าเมือง", "Transit ke penerbangan internasional: ikuti papan Transfer, jangan ke imigrasi.", "Conexión internacional: sigue las señales de Transfer en lugar de pasar inmigración.", "국제선 환승은 입국 심사로 가지 말고 환승(Transfer) 안내를 따라가요.") },
  { text: t("Transfer security screening, then check your next gate on the screens.", "乗り継ぎ用の保安検査を受け、画面で次の搭乗口を確認します。", "过中转安检，在屏幕上查看下一个登机口。", "Contrôle de sécurité des correspondances, puis cherchez votre prochaine porte sur les écrans.", "Kiểm tra an ninh nối chuyến rồi xem cửa tiếp theo trên màn hình.", "ตรวจค้นสำหรับต่อเครื่อง แล้วดูประตูถัดไปบนจอ", "Pemeriksaan keamanan transit, lalu cek gerbang berikutnya di layar.", "Control de seguridad de conexión y consulta tu siguiente puerta en las pantallas.", "환승 보안 검색 후 화면에서 다음 탑승구를 확인해요.") },
  {
    text: t("Whether your bags go straight through depends on your ticket. Ask your airline.", "手荷物が最終目的地まで行くかは航空券によります。航空会社に確認してください。", "行李是否直挂取决于机票，请问航空公司。", "Vos bagages suivent directement ou non selon votre billet. Demandez à votre compagnie.", "Hành lý có được chuyển thẳng hay không tùy vé. Hãy hỏi hãng bay.", "กระเป๋าจะส่งต่อถึงปลายทางหรือไม่ขึ้นกับตั๋ว ถามสายการบิน", "Bagasi langsung diteruskan atau tidak tergantung tiketmu. Tanyakan maskapai.", "Que la maleta vaya directa depende de tu billete. Pregunta a tu aerolínea.", "짐이 최종 목적지까지 가는지는 항공권에 따라 달라요. 항공사에 확인하세요."),
    note: t("Majungi can't guarantee you'll make the connection.", "乗り継ぎに間に合うことは保証できません。", "Majungi 不能保证你赶得上转机。", "Majungi ne peut pas garantir que vous aurez votre correspondance.", "Majungi không đảm bảo bạn kịp nối chuyến.", "Majungi รับประกันไม่ได้ว่าจะต่อเครื่องทัน", "Majungi tidak bisa menjamin kamu sempat transit.", "Majungi no puede garantizar que llegues a la conexión.", "환승편 탑승은 보장할 수 없어요."),
  },
];
// 김포 국제선: 순서는 국제선 일반 순서와 같지만 층 정보는 확인하지 못했다
const GMP_FLOORS_NOTE = t("Floors at Gimpo weren't confirmed. Follow the signs or check the official site.", "金浦の階数は未確認です。案内表示か公式サイトで確認してください。", "金浦的楼层信息未确认，请看指示牌或官网。", "Les étages à Gimpo n'ont pas été confirmés. Suivez les panneaux ou consultez le site officiel.", "Chưa xác nhận tầng ở Gimpo. Hãy theo biển chỉ dẫn hoặc xem trang chính thức.", "ยังไม่ได้ยืนยันชั้นที่กิมโป ให้ดูป้ายหรือเว็บทางการ", "Lantai di Gimpo belum dipastikan. Ikuti papan petunjuk atau cek situs resmi.", "No se confirmaron las plantas en Gimpo. Sigue las señales o consulta la web oficial.", "김포의 층 정보는 확인하지 못했어요. 안내판이나 공식 사이트를 보세요.");

export function stepsFor(airport: AirportCode, terminal: Terminal, stage: Stage): Step[] {
  const domestic = terminal === "domestic";
  if (stage === "transfer") return airport === "ICN" ? TRANSFER_ICN : [];
  if (domestic) return stage === "arrival" ? DOMESTIC_ARRIVAL : DOMESTIC_DEPARTURE;
  if (airport === "ICN") return stage === "arrival" ? INTL_ARRIVAL_ICN : INTL_DEPARTURE_ICN;
  // 김포 국제선: 국제선 일반 순서에서 인천 층 표기를 뺀다
  const base = stage === "arrival" ? INTL_ARRIVAL_ICN : INTL_DEPARTURE_ICN;
  return base.map((step, i) => ({ text: step.text, note: i === 0 ? GMP_FLOORS_NOTE : step.note }));
}

export type FacilityKind = "sim" | "money" | "wifi";
export type Facility = {
  kind: FacilityKind;
  airport: AirportCode;
  terminal: Terminal | "both";
  name: string;
  where: L; // 위치 (공식 페이지 표현)
  area: "public" | "unconfirmed"; // 일반구역(보안검색 전) 여부
  hours?: string; // 확인한 운영시간만 (없으면 미확인)
  stages: Stage[];
  source: Source;
};

const nearF = t("1F, near Arrival Hall F (west side)", "1階 到着ロビーF付近（西側）", "1楼 到达大厅F附近（西侧）", "1er étage, près du hall d'arrivée F (côté ouest)", "Tầng 1, gần sảnh đến F (phía tây)", "ชั้น 1 ใกล้โถงขาเข้า F (ฝั่งตะวันตก)", "Lantai 1, dekat Aula Kedatangan F (sisi barat)", "1.ª planta, junto al vestíbulo de llegadas F (lado oeste)", "1층 입국장 F 근처 (서편)");

export const FACILITIES: Facility[] = [
  { kind: "sim", airport: "ICN", terminal: "T1", name: "KT Roaming Center", where: nearF, area: "public", hours: "24h", stages: ["arrival"], source: SOURCES.icnFacilities },
  { kind: "sim", airport: "ICN", terminal: "T1", name: "SK Telecom Roaming Center", where: nearF, area: "public", hours: "24h", stages: ["arrival"], source: SOURCES.icnFacilities },
  { kind: "sim", airport: "ICN", terminal: "T1", name: "LG U+ Roaming Center", where: nearF, area: "public", hours: "24h", stages: ["arrival"], source: SOURCES.icnFacilities },
  { kind: "wifi", airport: "ICN", terminal: "T1", name: "Wifi dosirak", where: nearF, area: "public", hours: "06:00–22:00", stages: ["arrival"], source: SOURCES.icnFacilities },
  {
    kind: "money",
    airport: "ICN",
    terminal: "T1",
    name: "KB Bank Currency Exchange",
    where: t("1F, near Arrival Hall B", "1階 到着ロビーB付近", "1楼 到达大厅B附近", "1er étage, près du hall d'arrivée B", "Tầng 1, gần sảnh đến B", "ชั้น 1 ใกล้โถงขาเข้า B", "Lantai 1, dekat Aula Kedatangan B", "1.ª planta, junto al vestíbulo de llegadas B", "1층 입국장 B 근처"),
    area: "public",
    hours: "24h",
    stages: ["arrival"],
    source: SOURCES.icnFacilities,
  },
  {
    kind: "money",
    airport: "ICN",
    terminal: "T1",
    name: "Woori Bank ATM",
    where: t("3F, near check-in counter H", "3階 チェックインカウンターH付近", "3楼 值机柜台H附近", "3e étage, près du comptoir d'enregistrement H", "Tầng 3, gần quầy làm thủ tục H", "ชั้น 3 ใกล้เคาน์เตอร์เช็กอิน H", "Lantai 3, dekat konter check-in H", "3.ª planta, junto al mostrador de facturación H", "3층 체크인 카운터 H 근처"),
    area: "public",
    hours: "24h",
    stages: ["departure"],
    source: SOURCES.icnFacilities,
  },
  {
    kind: "sim",
    airport: "GMP",
    terminal: "international",
    name: "SKT Roaming",
    where: t("International terminal 1F, next to Gate 1", "国際線1階 1番ゲート横", "国际线1楼 1号门旁", "Terminal international, 1er étage, à côté de la porte 1", "Nhà ga quốc tế tầng 1, cạnh cổng 1", "อาคารระหว่างประเทศชั้น 1 ข้างประตู 1", "Terminal internasional lantai 1, di sebelah Gerbang 1", "Terminal internacional, 1.ª planta, junto a la puerta 1", "국제선 1층 1번 게이트 옆"),
    area: "unconfirmed",
    stages: ["arrival", "departure"],
    source: SOURCES.gmpFacilities,
  },
  {
    kind: "wifi",
    airport: "GMP",
    terminal: "both",
    name: "Gimpo_Airport Free Wi-Fi",
    where: t("Domestic and international terminals", "国内線・国際線ターミナル", "国内线和国际线航站楼", "Terminaux intérieur et international", "Nhà ga nội địa và quốc tế", "อาคารในประเทศและระหว่างประเทศ", "Terminal domestik dan internasional", "Terminales nacional e internacional", "국내선·국제선 청사"),
    area: "unconfirmed",
    stages: ["arrival", "departure", "transfer"],
    source: SOURCES.gmpFacilities,
  },
];

export function facilitiesFor(airport: AirportCode, terminal: Terminal, stage: Stage): Facility[] {
  return FACILITIES.filter((f) => f.airport === airport && (f.terminal === terminal || f.terminal === "both") && f.stages.includes(stage));
}

// 공항과 시내를 잇는 교통 (공식 페이지 확인 범위)
export type TransportFact = { text: L; source: Source };
export const AIRPORT_TRANSPORT: Record<AirportCode, TransportFact[]> = {
  ICN: [
    {
      text: t("Airport railroad (AREX): Transportation Center, B1 of each terminal. About 66 min from Terminal 1 to Seoul Station on the all-stop train; T2 → T1 about 6 min.", "空港鉄道（AREX）：各ターミナル地下1階の交通センター。各駅停車で第1ターミナル→ソウル駅 約66分、T2→T1 約6分。", "机场铁路（AREX）：各航站楼地下1层交通中心。普通列车从T1到首尔站约66分钟，T2→T1约6分钟。", "Train de l'aéroport (AREX) : pôle transports au niveau B1 de chaque terminal. Environ 66 min du terminal 1 à la gare de Séoul en train omnibus ; T2 → T1 environ 6 min.", "Tàu sân bay (AREX): Trung tâm giao thông tầng B1 mỗi nhà ga. Tàu thường từ T1 tới ga Seoul khoảng 66 phút; T2 → T1 khoảng 6 phút.", "รถไฟสนามบิน (AREX): ศูนย์การขนส่งชั้น B1 ของแต่ละอาคาร รถธรรมดาจาก T1 ถึงสถานีโซลราว 66 นาที T2 → T1 ราว 6 นาที", "Kereta bandara (AREX): Pusat Transportasi lantai B1 tiap terminal. Kereta biasa dari T1 ke Stasiun Seoul sekitar 66 menit; T2 → T1 sekitar 6 menit.", "Tren del aeropuerto (AREX): centro de transporte en la planta B1 de cada terminal. Unos 66 min de T1 a la estación de Seúl en el tren de todas las paradas; T2 → T1 unos 6 min.", "공항철도(AREX): 각 터미널 지하 1층 교통센터. 일반열차로 제1터미널→서울역 약 66분, T2→T1 약 6분."),
      source: SOURCES.icnRail,
    },
    {
      text: t("Fares and timetables: ask the airport railroad (1599-7788) or its official site.", "運賃と時刻表は空港鉄道（1599-7788）か公式サイトで確認してください。", "票价和时刻表请问机场铁路（1599-7788）或官网。", "Prix et horaires : renseignez-vous auprès du train de l'aéroport (1599-7788) ou sur son site officiel.", "Giá vé và lịch chạy: hỏi tàu sân bay (1599-7788) hoặc trang chính thức.", "ค่าโดยสารและตารางเวลา: ถามรถไฟสนามบิน (1599-7788) หรือเว็บทางการ", "Tarif dan jadwal: tanyakan kereta bandara (1599-7788) atau situs resminya.", "Tarifas y horarios: pregunta al tren del aeropuerto (1599-7788) o en su web oficial.", "요금과 시간표는 공항철도(1599-7788)나 공식 사이트에서 확인하세요."),
      source: SOURCES.icnRail,
    },
  ],
  GMP: [
    {
      text: t("Rail at Gimpo Airport station: Line 5, Line 9, Airport Railroad (AREX), Gimpo Goldline, Seohae Line.", "金浦空港駅の鉄道：5号線、9号線、空港鉄道（AREX）、金浦ゴールドライン、西海線。", "金浦机场站铁路：5号线、9号线、机场铁路（AREX）、金浦黄金线、西海线。", "Gare de l'aéroport de Gimpo : ligne 5, ligne 9, train de l'aéroport (AREX), Gimpo Goldline et ligne Seohae.", "Ga sân bay Gimpo: tuyến 5, tuyến 9, tàu sân bay (AREX), Gimpo Goldline, tuyến Seohae.", "สถานีสนามบินกิมโป: สาย 5 สาย 9 รถไฟสนามบิน (AREX) Gimpo Goldline และสาย Seohae", "Stasiun Bandara Gimpo: Jalur 5, Jalur 9, kereta bandara (AREX), Gimpo Goldline, Jalur Seohae.", "Estación Aeropuerto de Gimpo: líneas 5 y 9, tren del aeropuerto (AREX), Gimpo Goldline y línea Seohae.", "김포공항역 철도: 5호선, 9호선, 공항철도(AREX), 김포골드라인, 서해선."),
      source: SOURCES.gmpSubway,
    },
    {
      text: t("Free airport shuttle between terminals, 06:00–23:00. International: 1F Gate 1, stop 5 on the right. Domestic: 1F Gate 4, stop 8 on the left.", "ターミナル間の無料シャトル 06:00–23:00。国際線：1階1番ゲートを出て右の5番乗り場。国内線：1階4番ゲートを出て左の8番乗り場。", "航站楼间免费穿梭巴士 06:00–23:00。国际线：1楼1号门出去右侧5号站。国内线：1楼4号门出去左侧8号站。", "Navette gratuite entre les terminaux, 06:00–23:00. International : 1er étage, porte 1, arrêt 5 sur la droite. Intérieur : 1er étage, porte 4, arrêt 8 sur la gauche.", "Xe buýt miễn phí giữa các nhà ga, 06:00–23:00. Quốc tế: tầng 1 cổng 1, trạm 5 bên phải. Nội địa: tầng 1 cổng 4, trạm 8 bên trái.", "รถรับส่งฟรีระหว่างอาคาร 06:00–23:00 ระหว่างประเทศ: ชั้น 1 ประตู 1 ป้าย 5 ทางขวา ในประเทศ: ชั้น 1 ประตู 4 ป้าย 8 ทางซ้าย", "Bus antar-terminal gratis 06:00–23:00. Internasional: lantai 1 Gerbang 1, halte 5 di kanan. Domestik: lantai 1 Gerbang 4, halte 8 di kiri.", "Lanzadera gratuita entre terminales, 06:00–23:00. Internacional: 1.ª planta, puerta 1, parada 5 a la derecha. Nacional: 1.ª planta, puerta 4, parada 8 a la izquierda.", "청사 간 무료 순환버스 06:00–23:00. 국제선: 1층 1번 게이트 나가서 오른쪽 5번 정류장. 국내선: 1층 4번 게이트 나가서 왼쪽 8번 정류장."),
      source: SOURCES.gmpTransport,
    },
  ],
};

// 공식 운항 정보(실시간 탑승구·벨트·지연)는 마중이가 조회하지 않는다: 각 공항 공식 홈의 운항 정보 메뉴로 보낸다
export const FLIGHT_INFO: Record<AirportCode, Source> = {
  ICN: { url: "https://www.airport.kr/ap_en/index.do", checkedAt: CHECKED, covers: "ICN home with Flight Information menu" },
  GMP: { url: "https://www.airport.co.kr/gimpoeng/index.do", checkedAt: CHECKED, covers: "GMP home with Flight schedule menu" },
};
