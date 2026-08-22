// format.js — 금액 입력 표기 (화면 공용)
// 원화는 정수, 외화는 소수점을 허용한다. 정산 엔진은 외화를 parseFloat로 읽으므로
// (settle.js·AddTab) 입력에서 소수점을 지우면 10.92가 1,092로 100배 커진다.

// 정수 금액: 숫자만 남기고 천단위 콤마. 원화 금액에 쓴다.
export function fmtInt(v) {
  const digits = (v || '').toString().replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ko-KR');
}

// 소수점 숫자만 남긴다 (콤마 없음). 환율처럼 자릿수 구분이 필요 없는 칸에 쓴다.
// 입력 중인 "10." 상태를 보존해야 하므로 숫자로 바꾸지 않고 문자열을 다듬어 돌려준다.
export function decOnly(v) {
  let s = (v || '').toString().replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, ''); // 점은 하나만
  return s;
}

// 소수점 금액: 외화에 쓴다. 콤마는 정수부에만 붙인다.
export function fmtDec(v) {
  const s = decOnly(v);
  if (!s) return '';
  const [intPart, decPart] = s.split('.');
  const head = intPart ? parseInt(intPart, 10).toLocaleString('ko-KR') : '';
  if (decPart === undefined) return head;
  return (head || '0') + '.' + decPart;
}

// 콤마를 걷어낸 숫자. 빈 값·잘못된 값은 0.
export function toNum(v) {
  return parseFloat((v || '').toString().replace(/,/g, '')) || 0;
}

// 소수점 둘째 자리까지 자르고 남는 0은 버린다 (12.50 → "12.5", 12.00 → "12")
export function trimDec(n) {
  return String(Math.round((Number(n) || 0) * 100) / 100);
}
