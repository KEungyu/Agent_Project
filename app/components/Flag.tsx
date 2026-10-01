import type { StaticImageData } from "next/image";
import cn from "flag-icons/flags/4x3/cn.svg";
import es from "flag-icons/flags/4x3/es.svg";
import id from "flag-icons/flags/4x3/id.svg";
import jp from "flag-icons/flags/4x3/jp.svg";
import kr from "flag-icons/flags/4x3/kr.svg";
import th from "flag-icons/flags/4x3/th.svg";
import tw from "flag-icons/flags/4x3/tw.svg";
import us from "flag-icons/flags/4x3/us.svg";
import vn from "flag-icons/flags/4x3/vn.svg";
import type { Language } from "@/lib/i18n/languages";

// 국기는 flag-icons(MIT)의 SVG 파일을 쓴다. 이모지 국기는 Windows에서 글자로 깨진다.
const FLAGS: Record<Language["flag"], StaticImageData | string> = { us, jp, cn, tw, vn, th, id, es, kr };

// 번들러에 따라 SVG import가 주소 문자열이나 { src } 객체로 온다
const srcOf = (image: StaticImageData | string) => (typeof image === "string" ? image : image.src);

export function Flag({ flag, size = 20 }: { flag: Language["flag"]; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 작은 정적 SVG라 이미지 최적화가 필요 없다
    <img className="flag" src={srcOf(FLAGS[flag])} alt="" width={size} height={Math.round((size * 3) / 4)} />
  );
}
