import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { requestTypeSchema, type RequestType } from "./schema";

export const DEFAULT_REQUEST_TYPES_DIR = path.join(process.cwd(), "data", "request-types");

export type LoadError = { file: string; issues: string[] };
export type LoadResult = { types: RequestType[]; errors: LoadError[] };

export function loadRequestTypes(dir: string = DEFAULT_REQUEST_TYPES_DIR): LoadResult {
  const files = readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort();
  const types: RequestType[] = [];
  const errors: LoadError[] = [];

  for (const name of files) {
    const file = path.join(dir, name);
    let raw: unknown;
    try {
      raw = parse(readFileSync(file, "utf8"));
    } catch (error) {
      errors.push({ file, issues: [`YAML 파싱 실패: ${(error as Error).message}`] });
      continue;
    }

    const result = requestTypeSchema.safeParse(raw);
    if (!result.success) {
      errors.push({
        file,
        issues: result.error.issues.map((issue) => `${issue.path.join(".") || "(루트)"}: ${issue.message}`),
      });
      continue;
    }

    const expectedId = name.replace(/\.ya?ml$/, "");
    if (result.data.id !== expectedId) {
      errors.push({ file, issues: [`id: 파일 이름(${expectedId})과 다름 (${result.data.id})`] });
      continue;
    }
    types.push(result.data);
  }

  return { types, errors };
}
