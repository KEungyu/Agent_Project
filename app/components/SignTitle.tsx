// 역명판처럼 한국어를 크게, 이용자 언어를 그 아래에 적는다. 한국어 화면에서는 한 번만 적는다.
export function SignTitle({
  id,
  ko,
  text,
  as: Tag = "h2",
  icon,
}: {
  id?: string;
  ko: string;
  text: string;
  as?: "h2" | "h3";
  icon?: React.ReactNode;
}) {
  return (
    <Tag id={id} className={`sign-title sign-title-${Tag}${icon ? " has-icon" : ""}`}>
      {icon && (
        <span className="sign-title-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span lang="ko" className="sign-title-ko">
        {ko}
      </span>
      {text !== ko && <span className="sign-title-text">{text}</span>}
    </Tag>
  );
}
