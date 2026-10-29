// 연습용 규칙 6가지 (연습자료/연습용_규칙목록.txt와 같은 내용)
// ※ 연습용 가상 조항입니다. 실제 법령·규정의 조항 번호나 문구가 아닙니다.

// 연습용 기준금액 (가상 값): 이 금액 미만 사업은 실적 제한을 할 수 없다
const PRACTICE_THRESHOLD = 100000000;

// "학력 제한 없음", "주민등록번호는 받지 않는다"처럼 요구하지 않는다는 문장은 잘못이 아니다
const NOT_REQUIRED = /제한\s*없|무관|요구하지\s*않|받지\s*않|기재하지\s*않|적지\s*않|제출하지\s*않/;

// 각 규칙의 find(doc)는 걸리는 줄 목록 [{ line, note }]을 돌려준다.
// doc.lines의 한 줄: { index, text, page, section }
const RULES = [
  {
    id: 1,
    title: "학력 등 불필요한 개인정보 요구",
    basis: "「연습용 개인정보 규정」 제3조",
    original: "업무에 꼭 필요하지 않은 개인정보(학력 등)를 요구해서는 안 된다.",
    action: "학력 기재란 삭제",
    find(doc) {
      return doc.lines
        .filter((l) => /학력/.test(l.text) && !NOT_REQUIRED.test(l.text))
        .map((l) => ({ line: l }));
    },
  },
  {
    id: 2,
    title: "주민등록번호 요구",
    basis: "「연습용 개인정보 규정」 제5조",
    original: "주민등록번호는 법에 근거가 있을 때만 받을 수 있다.",
    action: "삭제 또는 생년월일로 대체",
    find(doc) {
      return doc.lines
        .filter((l) => /주민등록번호|주민번호/.test(l.text) && !NOT_REQUIRED.test(l.text))
        .map((l) => ({ line: l }));
    },
  },
  {
    id: 3,
    title: "기준금액 미만 사업의 실적 제한",
    basis: "「연습용 계약규정」 제15조",
    original:
      "예산이 연습용 기준금액(1억 원) 미만인 사업은 실적으로 참가나 평가를 제한할 수 없다.",
    action: "실적 제한 문구 삭제",
    find(doc) {
      // 예산을 모르거나 기준금액 이상이면 실적 평가를 넣어도 된다
      if (doc.budget == null || doc.budget >= PRACTICE_THRESHOLD) return [];
      return doc.lines
        .filter((l) => /실적/.test(l.text) && /자격|평가/.test(l.section))
        .map((l) => ({
          line: l,
          note: `사업 예산 ${formatWon(doc.budget)} < 연습용 기준금액 ${formatWon(PRACTICE_THRESHOLD)}`,
        }));
    },
  },
  {
    id: 4,
    title: "특정 지역 업체로 참가 자격 제한",
    basis: "「연습용 계약규정」 제9조",
    original: "특별한 이유 없이 특정 지역 업체로 참가 자격을 제한할 수 없다.",
    action: "지역 제한 문구 삭제",
    find(doc) {
      return doc.lines
        .filter(
          (l) =>
            /소재지|본사|지역/.test(l.text) &&
            /업체만|업체로 한정|업체에 한함|만 참가/.test(l.text)
        )
        .map((l) => ({ line: l }));
    },
  },
  {
    id: 5,
    title: "개정 전 옛 조항 번호 인용",
    basis: "「연습용 계약규정」 부칙",
    original: "제12조는 개정으로 제15조로 옮겨졌다.",
    action: "조항 번호를 제15조로 수정",
    find(doc) {
      return doc.lines
        .filter((l) => /연습용 계약규정」?\s*제\s*12\s*조/.test(l.text))
        .map((l) => ({ line: l }));
    },
  },
  {
    id: 6,
    title: "보안서약서 누락",
    basis: "「연습용 보안규정」 제7조",
    original: "외부 업체가 기관 자료를 다루는 용역은 보안서약서를 받아야 한다.",
    action: "제출 서류(또는 보안 요구사항)에 보안서약서 추가",
    find(doc) {
      if (/보안\s*서약서/.test(doc.fullText)) return [];
      // 문서 전체에 없으면 '보안 요구사항' 제목 줄(없으면 제출 서류 제목 줄)을 가리킨다
      const heading =
        doc.lines.find((l) => l.isHeading && /보안/.test(l.text)) ||
        doc.lines.find((l) => l.isHeading && /제출/.test(l.text)) ||
        doc.lines[0];
      return heading
        ? [{ line: heading, note: "문서 어디에도 보안서약서 제출 항목이 없음" }]
        : [];
    },
  },
];

// "8천만 원", "1억 5천만 원", "120,000,000원" 같은 글을 숫자로 바꾼다
function parseWon(text) {
  const s = text.replace(/\s/g, "");
  let total = 0;
  let found = false;
  const eok = s.match(/(\d+)억/);
  if (eok) { total += +eok[1] * 1e8; found = true; }
  const cheonman = s.match(/(\d+)천만/);
  if (cheonman) { total += +cheonman[1] * 1e7; found = true; }
  const baekman = s.match(/(\d+)백만/);
  if (baekman) { total += +baekman[1] * 1e6; found = true; }
  if (!found) {
    const man = s.match(/([\d,]+)만/);
    if (man) { total += +man[1].replace(/,/g, "") * 1e4; found = true; }
  }
  if (!found) {
    const won = s.match(/([\d,]{4,})원/);
    if (won) { total = +won[1].replace(/,/g, ""); found = true; }
  }
  return found ? total : null;
}

function formatWon(n) {
  const eok = Math.floor(n / 1e8);
  const man = Math.round((n % 1e8) / 1e4);
  const parts = [];
  if (eok) parts.push(`${eok}억`);
  if (man) parts.push(`${man.toLocaleString("ko-KR")}만`);
  return (parts.join(" ") || "0") + " 원";
}
