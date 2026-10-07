import type { City } from "./cities";

// 공식 관광 안내와 대조한 추가 거점. 확인 링크는 docs/QA-cities-2026-10-07.md.
export const ADDITIONAL_CITIES: City[] = [
  {
    id: "daegu",
    name: { ko: "대구", en: "Daegu", ja: "大邱", "zh-CN": "大邱", fr: "Daegu", es: "Daegu", vi: "Daegu", th: "แทกู", id: "Daegu" },
    tagline: { ko: "시장과 음악, 도심 골목 산책", en: "Markets, music and downtown walks", ja: "市場と音楽、街なかの路地歩き", "zh-CN": "市场、音乐与市中心漫步", fr: "Marchés, musique et balades en ville", es: "Mercados, música y paseos por el centro", vi: "Chợ, âm nhạc và dạo phố", th: "ตลาด ดนตรี และเดินเล่นในเมือง", id: "Pasar, musik, dan jalan-jalan di pusat kota" },
    spots: [
      {
        category: "food", name: { ko: "서문시장", en: "Seomun Market" },
        desc: { ko: "먹거리와 직물 가게를 둘러볼 수 있는 대구의 전통시장.", en: "A traditional market with food stalls and textile shops.", ja: "屋台料理や織物の店が並ぶ伝統市場。", "zh-CN": "可以逛小吃摊和纺织品店的传统市场。", fr: "Un marché traditionnel avec des stands de cuisine et des boutiques de tissus.", es: "Un mercado tradicional con puestos de comida y tiendas de tejidos.", vi: "Chợ truyền thống với các quầy đồ ăn và cửa hàng vải.", th: "ตลาดดั้งเดิมที่มีร้านอาหารและร้านผ้า", id: "Pasar tradisional dengan kedai makanan dan toko kain." },
      },
      {
        category: "experience", name: { ko: "김광석 다시그리기길", en: "Kim Gwangseok-gil Street" },
        desc: { ko: "가수 김광석을 기리는 벽화와 음악 테마의 골목.", en: "A mural-lined street celebrating singer Kim Gwang-seok.", ja: "歌手キム・グァンソクをしのぶ壁画が並ぶ通り。", "zh-CN": "以壁画纪念歌手金光石的街道。", fr: "Une rue de fresques en hommage au chanteur Kim Gwang-seok.", es: "Una calle de murales dedicada al cantante Kim Gwang-seok.", vi: "Con phố tranh tường tưởng nhớ ca sĩ Kim Gwang-seok.", th: "ถนนภาพจิตรกรรมฝาผนังเพื่อรำลึกถึงนักร้องคิมกวังซอก", id: "Jalan penuh mural untuk mengenang penyanyi Kim Gwang-seok." },
      },
      {
        category: "sight", name: { ko: "근대문화골목", en: "Modern Culture Alley" },
        desc: { ko: "도심의 역사 건물과 골목을 걸으며 대구의 근대사를 만나는 곳.", en: "Explore Daegu's modern history through downtown lanes and historic buildings.", ja: "街なかの路地と歴史的建物を歩いて大邱の近代史に触れます。", "zh-CN": "沿市中心的巷道和历史建筑了解大邱近代史。", fr: "Découvrez l'histoire moderne de Daegu dans ses ruelles et bâtiments historiques.", es: "Descubre la historia moderna de Daegu entre callejones y edificios históricos.", vi: "Khám phá lịch sử cận đại Daegu qua các con hẻm và công trình lịch sử.", th: "เรียนรู้ประวัติศาสตร์สมัยใหม่ของแทกูผ่านตรอกและอาคารเก่าในเมือง", id: "Jelajahi sejarah modern Daegu melalui gang dan bangunan bersejarah." },
      },
      {
        category: "sight", name: { ko: "동화사", en: "Donghwasa Temple" },
        desc: { ko: "팔공산 자락의 큰 절. 거대한 석조 약사여래대불로 알려져 있어요.", en: "A large Buddhist temple on Palgongsan mountain, known for its huge stone Buddha.", ja: "八公山のふもとにある大きな寺。巨大な石造の薬師如来大仏で知られます。", "zh-CN": "位于八公山脚下的大寺院，以巨大的石造药师如来大佛闻名。", fr: "Un grand temple bouddhiste sur le mont Palgongsan, connu pour son immense bouddha de pierre.", es: "Un gran templo budista en el monte Palgongsan, famoso por su enorme Buda de piedra.", vi: "Ngôi chùa lớn trên núi Palgongsan, nổi tiếng với tượng Phật đá khổng lồ.", th: "วัดพุทธขนาดใหญ่บนเขาพัลกงซาน มีชื่อเสียงจากพระพุทธรูปหินองค์ใหญ่", id: "Kuil Buddha besar di Gunung Palgongsan, terkenal dengan patung Buddha batu raksasa." },
      },
      {
        category: "night", name: { ko: "83타워", en: "83 Tower" },
        desc: { ko: "이월드 놀이공원 안의 타워. 전망대에서 대구 야경을 볼 수 있어요.", en: "A tower in E-World amusement park, with an observatory for night views over Daegu.", ja: "遊園地イーワールドにあるタワー。展望台から大邱の夜景が見られます。", "zh-CN": "位于E-World游乐园内的塔，可从观景台欣赏大邱夜景。", fr: "Une tour dans le parc d'attractions E-World, avec un belvédère pour voir Daegu de nuit.", es: "Una torre en el parque de atracciones E-World, con mirador para ver Daegu de noche.", vi: "Tháp trong công viên giải trí E-World, có đài quan sát ngắm cảnh đêm Daegu.", th: "หอคอยในสวนสนุกอีเวิลด์ มีจุดชมวิวยามค่ำคืนของแทกู", id: "Menara di taman hiburan E-World, dengan dek observasi untuk melihat Daegu di malam hari." },
      },
      {
        category: "night", name: { ko: "수성못", en: "Suseongmot Lake" },
        desc: { ko: "호수를 따라 산책길이 이어지는 공원. 저녁이면 조명이 켜져요.", en: "A lakeside park with a walking path, lit up in the evening.", ja: "湖に沿って散歩道が続く公園。夕方になるとライトアップされます。", "zh-CN": "环湖有散步道的公园，傍晚会亮起灯光。", fr: "Un parc au bord du lac avec une promenade, illuminé le soir.", es: "Un parque junto al lago con un paseo, iluminado por la tarde.", vi: "Công viên ven hồ có lối đi dạo, lên đèn vào buổi tối.", th: "สวนริมทะเลสาบมีทางเดินเล่น เปิดไฟสวยงามในตอนเย็น", id: "Taman di tepi danau dengan jalur jalan kaki, diterangi lampu di malam hari." },
      },
      {
        category: "night", name: { ko: "앞산 전망대", en: "Apsan Observatory" },
        desc: { ko: "케이블카로 오르는 앞산의 전망대. 도시 야경 명소예요.", en: "A lookout on Apsan mountain, reached by cable car, known for city night views.", ja: "ケーブルカーで上る前山の展望台。街の夜景の名所です。", "zh-CN": "乘缆车上前山的观景台，是欣赏城市夜景的好去处。", fr: "Un belvédère sur le mont Apsan, accessible en téléphérique, réputé pour la vue de nuit sur la ville.", es: "Un mirador en el monte Apsan, al que se sube en teleférico, famoso por las vistas nocturnas.", vi: "Đài quan sát trên núi Apsan, đi lên bằng cáp treo, nổi tiếng với cảnh thành phố về đêm.", th: "จุดชมวิวบนเขาอัพซาน ขึ้นด้วยกระเช้า เป็นที่นิยมสำหรับชมวิวเมืองยามค่ำคืน", id: "Gardu pandang di Gunung Apsan, dicapai dengan kereta gantung, terkenal dengan pemandangan malam kota." },
      },
      {
        category: "shopping", name: { ko: "약령시", en: "Yangnyeongsi Herbal Medicine Market" },
        desc: { ko: "오래된 한약재 시장. 한의약 박물관도 함께 둘러볼 수 있어요.", en: "One of Korea's oldest herbal medicine markets, with a museum on traditional medicine.", ja: "韓国でも歴史の長い漢方薬材の市場。韓医薬の博物館もあります。", "zh-CN": "韩国历史悠久的中药材市场，还有韩医药博物馆。", fr: "L'un des plus anciens marchés de plantes médicinales de Corée, avec un musée de la médecine traditionnelle.", es: "Uno de los mercados de hierbas medicinales más antiguos de Corea, con un museo de medicina tradicional.", vi: "Một trong những chợ thuốc bắc lâu đời nhất Hàn Quốc, có bảo tàng y học cổ truyền.", th: "ตลาดสมุนไพรเก่าแก่แห่งหนึ่งของเกาหลี มีพิพิธภัณฑ์การแพทย์แผนโบราณด้วย", id: "Salah satu pasar jamu tertua di Korea, dengan museum pengobatan tradisional." },
      },
      {
        category: "shopping", name: { ko: "동성로", en: "Dongseong-ro" },
        desc: { ko: "가게와 카페가 모여 있는 대구의 대표 번화가.", en: "Daegu's main shopping street, packed with shops and cafés.", ja: "ショップやカフェが集まる大邱いちばんの繁華街。", "zh-CN": "商店和咖啡馆林立的大邱主要商业街。", fr: "La grande rue commerçante de Daegu, pleine de boutiques et de cafés.", es: "La principal calle comercial de Daegu, llena de tiendas y cafés.", vi: "Phố mua sắm chính của Daegu, đầy cửa hàng và quán cà phê.", th: "ถนนช้อปปิ้งหลักของแทกู เต็มไปด้วยร้านค้าและคาเฟ่", id: "Jalan belanja utama Daegu, penuh toko dan kafe." },
      },
      {
        category: "food", name: { ko: "안지랑 곱창골목", en: "Anjirang Gopchang Alley" },
        desc: { ko: "돼지 곱창을 구워 먹는 가게가 늘어선 골목. 대구 사람들이 즐겨 찾아요.", en: "An alley of restaurants grilling pork intestines (gopchang), a Daegu favorite.", ja: "豚ホルモン（コプチャン）焼きの店が並ぶ路地。大邱の人に人気です。", "zh-CN": "一条烤猪肠（烤肠）店林立的小巷，深受大邱人喜爱。", fr: "Une ruelle de restaurants où l'on grille des tripes de porc (gopchang), très appréciées à Daegu.", es: "Un callejón de restaurantes de tripas de cerdo a la parrilla (gopchang), muy popular en Daegu.", vi: "Con hẻm toàn quán lòng heo nướng (gopchang), món người Daegu rất thích.", th: "ตรอกร้านไส้หมูย่าง (โกพชัง) ของโปรดของคนแทกู", id: "Gang berisi rumah makan usus babi panggang (gopchang), favorit warga Daegu." },
      },
      {
        category: "sight", name: { ko: "도동서원", en: "Dodong Seowon" },
        desc: { ko: "낙동강가의 조선 시대 서원. 유네스코 세계유산 '한국의 서원' 중 한 곳이에요.", en: "A Joseon-era Confucian academy by the Nakdong River, part of the UNESCO-listed Seowon.", ja: "洛東江のほとりにある朝鮮時代の書院。ユネスコ世界遺産「韓国の書院」のひとつです。", "zh-CN": "洛东江畔的朝鲜时代书院，是联合国教科文组织世界遗产“韩国书院”之一。", fr: "Une académie confucéenne de l'époque Joseon au bord du fleuve Nakdong, inscrite à l'UNESCO.", es: "Una academia confuciana de la era Joseon junto al río Nakdong, parte del patrimonio UNESCO.", vi: "Thư viện Nho giáo thời Joseon bên sông Nakdong, thuộc di sản UNESCO.", th: "สำนักศึกษาขงจื๊อสมัยโชซ็อนริมแม่น้ำนักทง เป็นมรดกโลกยูเนสโก", id: "Akademi Konfusius era Joseon di tepi Sungai Nakdong, bagian dari warisan UNESCO." },
      },
      {
        category: "sight", name: { ko: "계산성당", en: "Gyesan Cathedral" },
        desc: { ko: "1900년대 초에 지은 붉은 벽돌 성당. 근대문화골목에서 가까워요.", en: "A red-brick cathedral from the early 1900s, close to the Modern Culture Alley.", ja: "1900年代初めに建てられた赤れんがの聖堂。近代文化路地のすぐ近くです。", "zh-CN": "建于1900年代初的红砖天主教堂，离近代文化胡同很近。", fr: "Une cathédrale en briques rouges du début des années 1900, près de la ruelle de la culture moderne.", es: "Una catedral de ladrillo rojo de principios del siglo XX, cerca del Callejón de la Cultura Moderna.", vi: "Nhà thờ gạch đỏ xây đầu thế kỷ 20, gần Hẻm Văn hóa Cận đại.", th: "อาสนวิหารอิฐแดงจากต้นทศวรรษ 1900 อยู่ใกล้ตรอกวัฒนธรรมสมัยใหม่", id: "Katedral bata merah dari awal 1900-an, dekat Gang Budaya Modern." },
      },
    ],
  },
  {
    id: "daejeon",
    name: { ko: "대전", en: "Daejeon", ja: "大田", "zh-CN": "大田", fr: "Daejeon", es: "Daejeon", vi: "Daejeon", th: "แทจอน", id: "Daejeon" },
    tagline: { ko: "과학과 수목원, 빵집 산책", en: "Science, gardens and bakeries", ja: "科学と樹木園、パン屋めぐり", "zh-CN": "科学、树木园与面包店", fr: "Sciences, jardins et boulangeries", es: "Ciencia, jardines y panaderías", vi: "Khoa học, vườn cây và tiệm bánh", th: "วิทยาศาสตร์ สวน และร้านขนมปัง", id: "Sains, taman, dan toko roti" },
    spots: [
      {
        category: "sight", name: { ko: "한밭수목원", en: "Hanbat Arboretum" },
        desc: { ko: "도심에서 다양한 나무와 정원을 둘러보며 산책하는 수목원.", en: "An urban arboretum for walks among trees and gardens.", ja: "街なかで木々や庭園を眺めながら散策できる樹木園。", "zh-CN": "可在树木和花园间散步的城市树木园。", fr: "Un arboretum urbain pour se promener entre arbres et jardins.", es: "Un arboreto urbano para pasear entre árboles y jardines.", vi: "Vườn cây trong thành phố để tản bộ giữa cây xanh và khu vườn.", th: "สวนรุกขชาติในเมืองสำหรับเดินชมต้นไม้และสวน", id: "Arboretum kota untuk berjalan di antara pepohonan dan taman." },
      },
      {
        category: "experience", name: { ko: "국립중앙과학관", en: "National Science Museum" },
        desc: { ko: "과학과 자연을 주제로 한 전시를 둘러볼 수 있는 박물관.", en: "A museum with exhibitions about science and nature.", ja: "科学や自然をテーマにした展示がある博物館。", "zh-CN": "展示科学与自然主题的博物馆。", fr: "Un musée consacré aux sciences et à la nature.", es: "Un museo con exposiciones sobre ciencia y naturaleza.", vi: "Bảo tàng với các triển lãm về khoa học và thiên nhiên.", th: "พิพิธภัณฑ์ที่มีนิทรรศการเกี่ยวกับวิทยาศาสตร์และธรรมชาติ", id: "Museum dengan pameran tentang sains dan alam." },
      },
      {
        category: "food", name: { ko: "성심당 본점", en: "Sungsimdang Main Store" },
        desc: { ko: "대전 도심의 대표 빵집. 다양한 빵을 구경하고 골라 보세요.", en: "A well-known downtown bakery with a variety of breads.", ja: "さまざまなパンが並ぶ大田中心部の有名なベーカリー。", "zh-CN": "大田市中心的知名面包店，有多种面包可选。", fr: "Une boulangerie réputée du centre-ville, avec un grand choix de pains.", es: "Una conocida panadería del centro con una variedad de panes.", vi: "Tiệm bánh nổi tiếng ở trung tâm với nhiều loại bánh mì.", th: "ร้านขนมปังชื่อดังในใจกลางเมือง มีขนมปังหลากหลายชนิด", id: "Toko roti terkenal di pusat kota dengan beragam pilihan roti." },
      },
      {
        category: "night", name: { ko: "한빛탑", en: "Hanbit Tower" },
        desc: { ko: "1993 대전 엑스포의 상징탑. 전망대가 있고 밤에는 조명이 켜져요.", en: "The landmark tower of the 1993 Daejeon Expo, with an observatory, lit up at night.", ja: "1993年大田エキスポのシンボルタワー。展望台があり、夜はライトアップされます。", "zh-CN": "1993年大田世博会的标志塔，设有观景台，夜晚会亮灯。", fr: "La tour emblématique de l'Expo de Daejeon 1993, avec un belvédère, illuminée la nuit.", es: "La torre emblemática de la Expo de Daejeon 1993, con mirador e iluminada de noche.", vi: "Tháp biểu tượng của Expo Daejeon 1993, có đài quan sát, lên đèn về đêm.", th: "หอคอยสัญลักษณ์งานแทจอนเอ็กซ์โป 1993 มีจุดชมวิวและเปิดไฟยามค่ำคืน", id: "Menara ikon Expo Daejeon 1993, dengan dek observasi, menyala di malam hari." },
      },
      {
        category: "sight", name: { ko: "대청호", en: "Daecheongho Lake" },
        desc: { ko: "큰 호수를 따라 산책길이 이어지는 곳. 물가 풍경을 보며 걷기 좋아요.", en: "A large lake with lakeside walking trails, nice for a scenic stroll.", ja: "大きな湖に沿って散策路が続く場所。水辺の景色を眺めながら歩けます。", "zh-CN": "沿着大湖有散步道，适合边走边欣赏湖景。", fr: "Un grand lac bordé de sentiers de promenade, idéal pour une balade au bord de l'eau.", es: "Un gran lago con senderos a la orilla, ideal para un paseo con vistas.", vi: "Hồ lớn có đường đi dạo ven hồ, rất hợp để ngắm cảnh.", th: "ทะเลสาบใหญ่มีเส้นทางเดินริมน้ำ เหมาะกับการเดินชมวิว", id: "Danau besar dengan jalur jalan kaki di tepinya, enak untuk berjalan sambil menikmati pemandangan." },
      },
      {
        category: "experience", name: { ko: "유성온천 족욕장", en: "Yuseong Hot Spring Foot Bath" },
        desc: { ko: "유성 온천 거리의 야외 족욕장. 따뜻한 온천물에 발을 담그고 쉬어 가요.", en: "An outdoor foot bath in the Yuseong hot spring area. Rest your feet in warm spring water.", ja: "儒城温泉街の屋外足湯。温かい温泉にゆったり足を浸せます。", "zh-CN": "儒城温泉街的户外足浴池，可以把脚泡在温泉水里休息。", fr: "Un bain de pieds en plein air dans le quartier thermal de Yuseong. Reposez vos pieds dans l'eau chaude.", es: "Un baño de pies al aire libre en la zona termal de Yuseong. Descansa los pies en agua termal.", vi: "Bể ngâm chân ngoài trời ở khu suối nước nóng Yuseong, ngâm chân thư giãn trong nước ấm.", th: "บ่อแช่เท้ากลางแจ้งในย่านน้ำพุร้อนยูซอง พักแช่เท้าในน้ำแร่อุ่นๆ", id: "Kolam rendam kaki terbuka di kawasan pemandian air panas Yuseong. Istirahatkan kaki di air hangat." },
      },
      {
        category: "experience", name: { ko: "계족산 황톳길", en: "Gyejoksan Red Clay Trail" },
        desc: { ko: "숲속을 맨발로 걷는 붉은 황톳길. 신발을 벗고 걸어 보세요.", en: "A forest trail of soft red clay for walking barefoot.", ja: "森の中を裸足で歩く赤土の道。靴を脱いで歩いてみましょう。", "zh-CN": "林间可以赤脚行走的红黄土步道。", fr: "Un sentier forestier en argile rouge où l'on marche pieds nus.", es: "Un sendero de arcilla roja en el bosque para caminar descalzo.", vi: "Con đường đất sét đỏ trong rừng để đi chân trần.", th: "ทางเดินดินแดงในป่าสำหรับเดินเท้าเปล่า", id: "Jalur tanah liat merah di hutan untuk berjalan tanpa alas kaki." },
      },
      {
        category: "sight", name: { ko: "장태산 자연휴양림", en: "Jangtaesan Recreational Forest" },
        desc: { ko: "키 큰 메타세쿼이아 숲 사이로 하늘길과 출렁다리가 있는 휴양림.", en: "A forest of tall dawn redwoods with a treetop walkway and a suspension bridge.", ja: "背の高いメタセコイアの森に空中散策路と吊り橋がある自然休養林。", "zh-CN": "高大的水杉林中有空中栈道和吊桥的自然休养林。", fr: "Une forêt de grands métaséquoias avec une passerelle dans les arbres et un pont suspendu.", es: "Un bosque de altas metasecuoyas con pasarela entre las copas y un puente colgante.", vi: "Rừng thủy sam cao vút với lối đi trên tán cây và cầu treo.", th: "ป่าเมตาเซคัวยาต้นสูง มีทางเดินลอยฟ้าและสะพานแขวน", id: "Hutan metasequoia tinggi dengan jalur di atas pohon dan jembatan gantung." },
      },
      {
        category: "food", name: { ko: "대전 중앙시장", en: "Daejeon Jungang Market" },
        desc: { ko: "대전역 근처의 큰 전통시장. 먹거리 골목도 있어요.", en: "A large traditional market near Daejeon Station, with food alleys.", ja: "大田駅近くの大きな伝統市場。食べ物の路地もあります。", "zh-CN": "大田站附近的大型传统市场，也有美食小巷。", fr: "Un grand marché traditionnel près de la gare de Daejeon, avec des ruelles gourmandes.", es: "Un gran mercado tradicional cerca de la estación de Daejeon, con callejones de comida.", vi: "Chợ truyền thống lớn gần ga Daejeon, có các hẻm ẩm thực.", th: "ตลาดดั้งเดิมขนาดใหญ่ใกล้สถานีแทจอน มีตรอกอาหารด้วย", id: "Pasar tradisional besar dekat Stasiun Daejeon, dengan gang-gang makanan." },
      },
      {
        category: "food", name: { ko: "칼국수", en: "Daejeon Kalguksu" },
        desc: { ko: "대전은 칼국수로 유명해요. 칼로 썬 면을 국물에 말아 먹는 음식이에요.", en: "Daejeon is known for kalguksu, knife-cut noodles served in a warm broth.", ja: "大田はカルグクスで有名。包丁で切った麺を温かいスープでいただきます。", "zh-CN": "大田以刀削面（刀切面）闻名，手切面条配热汤。", fr: "Daejeon est réputée pour le kalguksu, des nouilles coupées au couteau dans un bouillon chaud.", es: "Daejeon es famosa por el kalguksu, fideos cortados a cuchillo en caldo caliente.", vi: "Daejeon nổi tiếng với kalguksu, mì cắt bằng dao ăn trong nước dùng nóng.", th: "แทจอนขึ้นชื่อเรื่องคัลกุกซู บะหมี่ตัดด้วยมีดในน้ำซุปร้อน", id: "Daejeon terkenal dengan kalguksu, mi potong pisau dalam kuah hangat." },
      },
      {
        category: "shopping", name: { ko: "으능정이 문화의거리", en: "Euneungjeongi Culture Street" },
        desc: { ko: "도심의 걷는 거리. 머리 위의 대형 LED 스크린(스카이로드)이 볼거리예요.", en: "A downtown pedestrian street under a giant LED canopy screen (Sky Road).", ja: "街なかの歩行者天国。頭上の巨大LEDスクリーン「スカイロード」が見どころです。", "zh-CN": "市中心的步行街，头顶的大型LED屏幕“天空之路”是一大看点。", fr: "Une rue piétonne du centre-ville sous un immense écran LED en voûte (Sky Road).", es: "Una calle peatonal del centro bajo una enorme pantalla LED en el techo (Sky Road).", vi: "Phố đi bộ trung tâm dưới màn hình LED khổng lồ trên cao (Sky Road).", th: "ถนนคนเดินกลางเมือง ใต้จอแอลอีดียักษ์บนหลังคา (สกายโรด)", id: "Jalan pejalan kaki pusat kota di bawah layar LED raksasa di atasnya (Sky Road)." },
      },
      {
        category: "experience", name: { ko: "대전오월드", en: "Daejeon O-World" },
        desc: { ko: "동물원과 놀이공원, 꽃 정원이 함께 있는 테마파크.", en: "A theme park with a zoo, rides and flower gardens.", ja: "動物園と遊園地、花の庭園がそろったテーマパーク。", "zh-CN": "集动物园、游乐园和花园于一体的主题公园。", fr: "Un parc à thème avec zoo, manèges et jardins fleuris.", es: "Un parque temático con zoológico, atracciones y jardines de flores.", vi: "Công viên chủ đề có sở thú, trò chơi và vườn hoa.", th: "สวนสนุกที่มีสวนสัตว์ เครื่องเล่น และสวนดอกไม้", id: "Taman tema dengan kebun binatang, wahana, dan taman bunga." },
      },
    ],
  },
  {
    id: "gwangju",
    name: { ko: "광주", en: "Gwangju", ja: "光州", "zh-CN": "光州", fr: "Gwangju", es: "Gwangju", vi: "Gwangju", th: "ควังจู", id: "Gwangju" },
    tagline: { ko: "예술과 시장, 문화 공간 산책", en: "Art, markets and cultural spaces", ja: "アートと市場、文化スポットめぐり", "zh-CN": "艺术、市场与文化空间", fr: "Art, marchés et lieux culturels", es: "Arte, mercados y espacios culturales", vi: "Nghệ thuật, chợ và không gian văn hóa", th: "ศิลปะ ตลาด และพื้นที่วัฒนธรรม", id: "Seni, pasar, dan ruang budaya" },
    spots: [
      {
        category: "experience", name: { ko: "국립아시아문화전당", en: "Asia Culture Center" },
        desc: { ko: "아시아 문화와 예술을 만나는 전시·공연 공간. 프로그램은 공식 안내를 확인하세요.", en: "Exhibitions and performances exploring Asian culture and art. Check the official program.", ja: "アジアの文化と芸術に触れる展示・公演施設。催しは公式案内で確認を。", "zh-CN": "探索亚洲文化与艺术的展览和演出空间，请查看官方节目。", fr: "Expositions et spectacles autour des cultures et arts d'Asie. Consultez le programme officiel.", es: "Exposiciones y espectáculos sobre la cultura y el arte de Asia. Consulta el programa oficial.", vi: "Không gian triển lãm và biểu diễn văn hóa, nghệ thuật châu Á. Xem chương trình chính thức.", th: "พื้นที่นิทรรศการและการแสดงวัฒนธรรมและศิลปะเอเชีย ตรวจสอบรายการทางการ", id: "Pameran dan pertunjukan budaya serta seni Asia. Periksa program resminya." },
      },
      {
        category: "food", name: { ko: "대인시장", en: "Daein Market" },
        desc: { ko: "전통시장과 예술 공간이 어우러진 곳. 야시장 일정은 방문 전에 확인하세요.", en: "A traditional market with art spaces. Check night-market dates before visiting.", ja: "伝統市場とアートが共存する場所。夜市の開催日は事前に確認を。", "zh-CN": "融合传统市场与艺术空间的地方，夜市日期请提前确认。", fr: "Un marché traditionnel mêlé d'espaces artistiques. Vérifiez les dates du marché nocturne.", es: "Un mercado tradicional con espacios artísticos. Comprueba las fechas del mercado nocturno.", vi: "Chợ truyền thống kết hợp không gian nghệ thuật. Kiểm tra lịch chợ đêm trước khi đến.", th: "ตลาดดั้งเดิมที่มีพื้นที่ศิลปะ ตรวจสอบวันจัดตลาดกลางคืนก่อนมา", id: "Pasar tradisional dengan ruang seni. Periksa jadwal pasar malam sebelum datang." },
      },
      {
        category: "shopping", name: { ko: "충장로", en: "Chungjang-ro Street" },
        desc: { ko: "상점과 카페를 둘러보며 걷기 좋은 광주 도심 거리.", en: "A downtown street for browsing shops and cafés.", ja: "ショップやカフェをめぐって歩く光州中心部の通り。", "zh-CN": "可以逛商店和咖啡馆的光州市中心街道。", fr: "Une rue du centre-ville pour découvrir boutiques et cafés.", es: "Una calle del centro para recorrer tiendas y cafés.", vi: "Con phố trung tâm để dạo quanh các cửa hàng và quán cà phê.", th: "ถนนใจกลางเมืองสำหรับเดินชมร้านค้าและคาเฟ่", id: "Jalan pusat kota untuk menjelajahi toko dan kafe." },
      },
      {
        category: "sight", name: { ko: "무등산 국립공원", en: "Mudeungsan National Park" },
        desc: { ko: "도시 가까이 있는 국립공원. 서석대·입석대 같은 기둥 모양 바위로 유명해요.", en: "A national park right by the city, famous for its columnar rock formations.", ja: "街のすぐそばの国立公園。瑞石台・立石台などの柱状の岩で有名です。", "zh-CN": "紧邻市区的国立公园，以瑞石台、立石台等柱状岩石闻名。", fr: "Un parc national aux portes de la ville, célèbre pour ses orgues rocheuses.", es: "Un parque nacional junto a la ciudad, famoso por sus formaciones de rocas en columnas.", vi: "Vườn quốc gia sát thành phố, nổi tiếng với những khối đá hình cột.", th: "อุทยานแห่งชาติใกล้เมือง มีชื่อเสียงจากหินรูปเสา", id: "Taman nasional di dekat kota, terkenal dengan formasi batu berbentuk tiang." },
      },
      {
        category: "sight", name: { ko: "양림동 역사문화마을", en: "Yangnim-dong History and Culture Village" },
        desc: { ko: "근대 선교사 사택과 교회, 갤러리가 모여 있는 동네.", en: "A neighborhood of early modern missionary houses, churches and galleries.", ja: "近代の宣教師住宅や教会、ギャラリーが集まる町。", "zh-CN": "聚集了近代传教士住宅、教堂和画廊的街区。", fr: "Un quartier de maisons de missionnaires du début du XXe siècle, d'églises et de galeries.", es: "Un barrio de casas de misioneros de principios del siglo XX, iglesias y galerías.", vi: "Khu phố có nhà của các nhà truyền giáo thời cận đại, nhà thờ và phòng tranh.", th: "ย่านบ้านมิชชันนารียุคแรก โบสถ์ และแกลเลอรี", id: "Kawasan rumah misionaris era modern awal, gereja, dan galeri." },
      },
      {
        category: "experience", name: { ko: "펭귄마을", en: "Penguin Village" },
        desc: { ko: "양림동의 작은 골목. 버려진 물건과 정크 아트로 꾸며져 있어요.", en: "A small alley in Yangnim-dong decorated with junk art and old objects.", ja: "楊林洞の小さな路地。古い道具やジャンクアートで飾られています。", "zh-CN": "杨林洞的小巷，用旧物和废品艺术装点。", fr: "Une petite ruelle de Yangnim-dong décorée d'objets anciens et d'art récup'.", es: "Un pequeño callejón de Yangnim-dong decorado con objetos viejos y arte reciclado.", vi: "Con hẻm nhỏ ở Yangnim-dong trang trí bằng đồ cũ và nghệ thuật phế liệu.", th: "ตรอกเล็กๆ ในย่านยังนิมดง ตกแต่งด้วยของเก่าและงานศิลปะจากขยะ", id: "Gang kecil di Yangnim-dong yang dihias barang bekas dan seni rongsokan." },
      },
      {
        category: "sight", name: { ko: "국립5·18민주묘지", en: "May 18th National Cemetery" },
        desc: { ko: "1980년 5·18 민주화운동 희생자를 모신 국립묘지.", en: "The national cemetery for those who died in the May 18, 1980 Democratic Uprising.", ja: "1980年の5・18民主化運動の犠牲者を祀る国立墓地。", "zh-CN": "安葬1980年5·18民主化运动遇难者的国立墓地。", fr: "Le cimetière national des victimes du soulèvement démocratique du 18 mai 1980.", es: "El cementerio nacional de las víctimas del levantamiento democrático del 18 de mayo de 1980.", vi: "Nghĩa trang quốc gia của những người đã mất trong phong trào dân chủ 18/5/1980.", th: "สุสานแห่งชาติของผู้เสียชีวิตในขบวนการประชาธิปไตย 18 พฤษภาคม 1980", id: "Pemakaman nasional bagi korban Gerakan Demokrasi 18 Mei 1980." },
      },
      {
        category: "food", name: { ko: "1913송정역시장", en: "1913 Songjeong Station Market" },
        desc: { ko: "KTX 광주송정역 앞의 시장. 간식과 작은 식당이 많아요.", en: "A market by Gwangju Songjeong Station (KTX), full of snacks and small eateries.", ja: "KTX光州松汀駅前の市場。軽食や小さな食堂がたくさんあります。", "zh-CN": "KTX光州松汀站前的市场，有很多小吃和小餐馆。", fr: "Un marché devant la gare KTX de Gwangju Songjeong, plein d'en-cas et de petits restaurants.", es: "Un mercado frente a la estación KTX de Gwangju Songjeong, lleno de tentempiés y pequeños restaurantes.", vi: "Khu chợ trước ga KTX Gwangju Songjeong, nhiều đồ ăn vặt và quán nhỏ.", th: "ตลาดหน้าสถานี KTX ควังจูซงจอง มีของว่างและร้านอาหารเล็กๆ มากมาย", id: "Pasar di depan Stasiun KTX Gwangju Songjeong, penuh jajanan dan kedai kecil." },
      },
      {
        category: "food", name: { ko: "송정 떡갈비", en: "Songjeong Tteokgalbi" },
        desc: { ko: "다진 갈비살을 빚어 구운 떡갈비. 송정동에 떡갈비 거리가 있어요.", en: "Grilled patties of minced beef short rib; Songjeong has a well-known tteokgalbi street.", ja: "刻んだカルビ肉をこねて焼いたトッカルビ。松汀洞にトッカルビ通りがあります。", "zh-CN": "把剁碎的排骨肉捏成饼烤制的“年糕排骨”，松汀洞有一条年糕排骨街。", fr: "Des galettes grillées de côtes de bœuf hachées ; Songjeong a une rue connue pour le tteokgalbi.", es: "Hamburguesas a la parrilla de costilla de res picada; Songjeong tiene una conocida calle de tteokgalbi.", vi: "Chả sườn bò băm nướng; Songjeong có con phố tteokgalbi nổi tiếng.", th: "ซี่โครงวัวสับปั้นแล้วย่าง (ต็อกกัลบี) ซงจองมีถนนต็อกกัลบีชื่อดัง", id: "Patty iga sapi cincang panggang; Songjeong punya jalan tteokgalbi yang terkenal." },
      },
      {
        category: "night", name: { ko: "사직공원 전망타워", en: "Sajik Park Observatory" },
        desc: { ko: "사직공원 안의 전망타워. 광주 시내를 내려다볼 수 있어요.", en: "An observation tower in Sajik Park with views over Gwangju.", ja: "社稷公園にある展望タワー。光州の街を見渡せます。", "zh-CN": "社稷公园内的观景塔，可以俯瞰光州市区。", fr: "Une tour d'observation dans le parc Sajik, avec vue sur Gwangju.", es: "Una torre mirador en el parque Sajik con vistas sobre Gwangju.", vi: "Tháp quan sát trong công viên Sajik, ngắm toàn cảnh Gwangju.", th: "หอชมวิวในสวนซาจิก มองเห็นเมืองควังจู", id: "Menara pandang di Taman Sajik dengan pemandangan Gwangju." },
      },
      {
        category: "sight", name: { ko: "국립광주박물관", en: "Gwangju National Museum" },
        desc: { ko: "호남 지역의 역사와 미술을 보여 주는 국립박물관.", en: "A national museum of the history and art of the Honam region.", ja: "湖南地方の歴史と美術を紹介する国立博物館。", "zh-CN": "展示湖南地区历史与艺术的国立博物馆。", fr: "Un musée national consacré à l'histoire et à l'art de la région de Honam.", es: "Un museo nacional de la historia y el arte de la región de Honam.", vi: "Bảo tàng quốc gia về lịch sử và nghệ thuật vùng Honam.", th: "พิพิธภัณฑ์แห่งชาติด้านประวัติศาสตร์และศิลปะของภูมิภาคโฮนัม", id: "Museum nasional tentang sejarah dan seni wilayah Honam." },
      },
      {
        category: "experience", name: { ko: "광주비엔날레 전시관", en: "Gwangju Biennale Exhibition Hall" },
        desc: { ko: "현대미술 축제 광주비엔날레가 열리는 곳. 전시 일정은 공식 안내를 확인하세요.", en: "Home of the Gwangju Biennale contemporary art festival. Check the official schedule.", ja: "現代美術の祭典・光州ビエンナーレの会場。展示日程は公式案内で確認を。", "zh-CN": "当代艺术节光州双年展的举办地，展期请查看官方信息。", fr: "Le lieu de la Biennale de Gwangju, festival d'art contemporain. Consultez le calendrier officiel.", es: "La sede de la Bienal de Gwangju, festival de arte contemporáneo. Consulta el calendario oficial.", vi: "Nơi tổ chức Gwangju Biennale, lễ hội nghệ thuật đương đại. Xem lịch chính thức.", th: "สถานที่จัดงานกวางจูเบียนนาเล่ เทศกาลศิลปะร่วมสมัย ตรวจสอบกำหนดการทางการ", id: "Tempat Gwangju Biennale, festival seni kontemporer. Periksa jadwal resminya." },
      },
    ],
  },
];
