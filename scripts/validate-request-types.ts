// 사용법: npm run validate:types [폴더]   (기본: data/request-types)
import path from "node:path";
import { DEFAULT_REQUEST_TYPES_DIR, loadRequestTypes } from "../lib/request-types/loader";

const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_REQUEST_TYPES_DIR;
const { types, errors } = loadRequestTypes(dir);

for (const type of types) console.log(`✓ ${type.id}`);
for (const error of errors) {
  console.log(`✗ ${path.relative(process.cwd(), error.file)}`);
  for (const issue of error.issues) console.log(`    - ${issue}`);
}
console.log(`유형 ID 목록: ${JSON.stringify(types.map((type) => type.id))}`);

if (errors.length > 0) process.exit(1);
