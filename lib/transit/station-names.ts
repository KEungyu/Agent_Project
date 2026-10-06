// 불어·스페인어·베트남어·인도네시아어 화면의 역 이름. 표지판 영어 이름 속 설명 단어(University, Office, Park …)만
// 그 언어로 옮기고 고유명사는 표지판 로마자 그대로 둔다. 여기 없는 역은 표지판 영어 이름을 쓴다(마중 팀이 옮김, 2026-10-06).

export const LOCAL_LANGUAGES = ["fr", "es", "vi", "id"] as const;
type Local = [fr: string, es: string, vi: string, id: string];

const guOffice = (n: string): Local => [`Mairie de ${n}-gu`, `Ayuntamiento de ${n}-gu`, `Văn phòng quận ${n}`, `Kantor ${n}-gu`];
const univ = (n: string): Local => [`Université ${n}`, `Universidad ${n}`, `Đại học ${n}`, `Universitas ${n}`];
const womensUniv = (n: string): Local => [`Université féminine ${n}`, `Universidad Femenina ${n}`, `Đại học Nữ ${n}`, `Universitas Wanita ${n}`];
const park = (n: string): Local => [`Parc ${n}`, `Parque ${n}`, `Công viên ${n}`, `Taman ${n}`];
const market = (n: string): Local => [`Marché de ${n}`, `Mercado ${n}`, `Chợ ${n}`, `Pasar ${n}`];
const digital = (n: string): Local => [`Complexe numérique de ${n}`, `Complejo Digital ${n}`, `Khu phức hợp kỹ thuật số ${n}`, `Kompleks Digital ${n}`];
const medical = (n: string): Local => [`Centre médical ${n}`, `Centro Médico ${n}`, `Trung tâm Y tế ${n}`, `Pusat Medis ${n}`];
const icn = (t: string): Local => [`Aéroport d'Incheon Terminal ${t}`, `Aeropuerto de Incheon Terminal ${t}`, `Sân bay Incheon Nhà ga ${t}`, `Bandara Incheon Terminal ${t}`];

// 한국어 역 이름 → [fr, es, vi, id]
const NAMES: Record<string, Local> = {
  시청: ["Hôtel de ville", "Ayuntamiento", "Tòa thị chính", "Balai Kota"],
  금천구청: guOffice("Geumcheon"),
  영등포구청: guOffice("Yeongdeungpo"),
  양천구청: guOffice("Yangcheon"),
  마포구청: guOffice("Mapo"),
  강남구청: guOffice("Gangnam"),
  부평구청: guOffice("Bupyeong"),
  강동구청: guOffice("Gangdong"),
  가산디지털단지: digital("Gasan"),
  구로디지털단지: digital("Guro"),
  광운대: univ("Kwangwoon"),
  홍대입구: univ("Hongik"),
  건대입구: univ("Konkuk"),
  한양대: univ("Hanyang"),
  동대입구: univ("Dongguk"),
  한성대입구: univ("Hansung"),
  총신대입구: univ("Chongsin"),
  숭실대입구: univ("Soongsil"),
  서강대: univ("Sogang"),
  가천대: univ("Gachon"),
  인하대: univ("Inha"),
  이대: womensUniv("Ewha"),
  성신여대입구: womensUniv("Sungshin"),
  숙대입구: womensUniv("Sookmyung"),
  외대앞: ["Université Hankuk des études étrangères", "Universidad Hankuk de Estudios Extranjeros", "Đại học Ngoại ngữ Hankuk", "Universitas Studi Asing Hankuk"],
  서울대입구: ["Université nationale de Séoul", "Universidad Nacional de Seúl", "Đại học Quốc gia Seoul", "Universitas Nasional Seoul"],
  교대: ["Université nationale d'éducation de Séoul", "Universidad Nacional de Educación de Seúl", "Đại học Sư phạm Quốc gia Seoul", "Universitas Pendidikan Nasional Seoul"],
  고려대: ["Université de Corée", "Universidad de Corea", "Đại học Korea", "Universitas Korea"],
  한국항공대: ["Université aérospatiale de Corée", "Universidad Aeroespacial de Corea", "Đại học Hàng không Hàn Quốc", "Universitas Kedirgantaraan Korea"],
  서울대벤처타운: ["Venture Town de l'Université nationale de Séoul", "Venture Town de la Universidad Nacional de Seúl", "Venture Town Đại học Quốc gia Seoul", "Venture Town Universitas Nasional Seoul"],
  종합운동장: ["Complexe sportif", "Complejo Deportivo", "Khu liên hợp thể thao", "Kompleks Olahraga"],
  부천종합운동장: ["Stade de Bucheon", "Estadio de Bucheon", "Sân vận động Bucheon", "Stadion Bucheon"],
  월드컵경기장: ["Stade de la Coupe du monde", "Estadio de la Copa Mundial", "Sân vận động World Cup", "Stadion Piala Dunia"],
  삼산체육관: ["Gymnase de Samsan", "Gimnasio Samsan", "Nhà thi đấu Samsan", "Gelanggang Olahraga Samsan"],
  동대문역사문화공원: ["Parc de l'histoire et de la culture de Dongdaemun", "Parque de Historia y Cultura de Dongdaemun", "Công viên Lịch sử và Văn hóa Dongdaemun", "Taman Sejarah dan Budaya Dongdaemun"],
  올림픽공원: ["Parc olympique", "Parque Olímpico", "Công viên Olympic", "Taman Olimpiade"],
  효창공원앞: park("Hyochang"),
  솔밭공원: park("Solbat"),
  보라매공원: park("Boramae"),
  경마공원: ["Parc de l'hippodrome de Séoul", "Parque del Hipódromo de Seúl", "Công viên Trường đua ngựa Seoul", "Taman Pacuan Kuda Seoul"],
  대공원: ["Grand parc de Séoul", "Gran Parque de Seúl", "Công viên Lớn Seoul", "Taman Raya Seoul"],
  어린이대공원: ["Grand parc des enfants", "Gran Parque Infantil", "Công viên Lớn Thiếu nhi", "Taman Raya Anak-anak"],
  장자호수공원: ["Parc du lac Jangja", "Parque del Lago Jangja", "Công viên Hồ Jangja", "Taman Danau Jangja"],
  암사역사공원: ["Parc historique d'Amsa", "Parque Histórico Amsa", "Công viên Lịch sử Amsa", "Taman Sejarah Amsa"],
  양재시민의숲: ["Forêt des citoyens de Yangjae", "Bosque Ciudadano de Yangjae", "Rừng Công dân Yangjae", "Hutan Warga Yangjae"],
  가락시장: market("Garak"),
  영등포시장: market("Yeongdeungpo"),
  공항시장: ["Marché de l'aéroport", "Mercado del Aeropuerto", "Chợ Sân bay", "Pasar Bandara"],
  고속터미널: ["Gare routière express", "Terminal de Autobuses Exprés", "Bến xe tốc hành", "Terminal Bus Ekspres"],
  남부터미널: ["Gare routière Nambu", "Terminal de Autobuses Nambu", "Bến xe Nambu", "Terminal Bus Nambu"],
  김포공항: ["Aéroport international de Gimpo", "Aeropuerto Internacional de Gimpo", "Sân bay Quốc tế Gimpo", "Bandara Internasional Gimpo"],
  인천공항1터미널: icn("1"),
  인천공항2터미널: icn("2"),
  공항화물청사: ["Terminal cargo de l'aéroport d'Incheon", "Terminal de Carga del Aeropuerto de Incheon", "Nhà ga Hàng hóa Sân bay Incheon", "Terminal Kargo Bandara Incheon"],
  경찰병원: ["Hôpital national de la police", "Hospital Nacional de la Policía", "Bệnh viện Cảnh sát Quốc gia", "Rumah Sakit Kepolisian Nasional"],
  중앙보훈병원: medical("VHS"),
  보라매병원: medical("Boramae"),
  국회의사당: ["Assemblée nationale", "Asamblea Nacional", "Quốc hội", "Gedung Majelis Nasional"],
  정부과천청사: ["Complexe gouvernemental de Gwacheon", "Complejo Gubernamental de Gwacheon", "Khu Chính phủ Gwacheon", "Kompleks Pemerintahan Gwacheon"],
  서울지방병무청: ["Bureau régional du service militaire de Séoul", "Oficina Regional de Servicio Militar de Seúl", "Văn phòng Nghĩa vụ Quân sự Khu vực Seoul", "Kantor Wajib Militer Regional Seoul"],
  "4.19민주묘지": ["Cimetière national du 19 avril", "Cementerio Nacional del 19 de Abril", "Nghĩa trang Quốc gia 19 tháng 4", "Pemakaman Nasional 19 April"],
  청라국제도시: ["Ville internationale de Cheongna", "Ciudad Internacional Cheongna", "Thành phố Quốc tế Cheongna", "Kota Internasional Cheongna"],
};

export function localStationName(ko: string, language: string): string | undefined {
  const i = (LOCAL_LANGUAGES as readonly string[]).indexOf(language);
  return i < 0 ? undefined : NAMES[ko]?.[i];
}

// 역 찾기용: 이 역의 모든 언어 이름
export const localStationNames = (ko: string): string[] => NAMES[ko] ?? [];
