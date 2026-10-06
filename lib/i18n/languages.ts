// 이용자가 고를 수 있는 언어. code는 보드의 user_language에 저장된다.
// flag는 node_modules/flag-icons/flags/4x3/<flag>.svg 파일 이름이다.
export const LANGUAGES = [
  { code: "en", flag: "us", nativeName: "English", englishName: "English" },
  { code: "ja", flag: "jp", nativeName: "日本語", englishName: "Japanese" },
  { code: "zh-CN", flag: "cn", nativeName: "简体中文", englishName: "Simplified Chinese" },
  { code: "vi", flag: "vn", nativeName: "Tiếng Việt", englishName: "Vietnamese" },
  { code: "th", flag: "th", nativeName: "ภาษาไทย", englishName: "Thai" },
  { code: "id", flag: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian" },
  { code: "es", flag: "es", nativeName: "Español", englishName: "Spanish" },
  { code: "fr", flag: "fr", nativeName: "Français", englishName: "French" },
  { code: "ko", flag: "kr", nativeName: "한국어", englishName: "Korean" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: string): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function getLanguage(code: string | undefined): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
