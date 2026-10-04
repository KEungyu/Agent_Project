// 한국 전화번호를 한국식·국제식으로 함께 보여준다. 번호를 만들어 내지 않고, 형식을 모르면 그대로 둔다.
// "02-123-4567" → 국제 "+82 2-123-4567", tel "+8221234567"
export function koreanPhone(raw: string): { local: string; international: string; tel: string } | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const national = digits.startsWith("+82") ? `0${digits.slice(3).replace(/^0/, "")}` : digits.startsWith("0") ? digits : null;
  if (!national || !/^0\d{8,10}$/.test(national)) return null;
  const area = national.startsWith("02") ? "2" : national.slice(1, 3);
  const rest = national.slice(area.length + 1);
  const grouped = `${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  return { local: `0${area}-${grouped}`, international: `+82 ${area}-${grouped}`, tel: `+82${area}${rest}` };
}
