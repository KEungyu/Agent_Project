import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./languages";
import { getMessages } from "./messages";

// 문구를 다듬다 {city} 같은 자리표시자가 빠지거나 바뀌면 화면이 깨진다. 모든 언어가 영어와 같은 자리표시자를 쓰는지 본다.
type Tree = { [key: string]: string | Tree };
const flatten = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]) => (typeof value === "string" ? [[prefix + key, value]] : flatten(value, `${prefix}${key}.`)));
const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");

describe("translations keep placeholders", () => {
  const en = Object.fromEntries(flatten(getMessages("en") as unknown as Tree));
  for (const language of LANGUAGES) {
    it(language.code, () => {
      const wrong = flatten(getMessages(language.code) as unknown as Tree)
        .filter(([key, value]) => holes(value) !== holes(en[key] ?? ""))
        .map(([key, value]) => `${key}: ${value}`);
      expect(wrong).toEqual([]);
    });
  }
});
