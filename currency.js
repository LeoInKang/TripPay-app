// currency.js — 여행의 통화 목록을 다루는 단일 출처
//
// 한 여행에 통화가 여러 개일 수 있다 (스위스 CHF + 이탈리아 EUR 같은 경유 여행).
// trip.currencies[0] 이 주 통화이고, trip.country 는 주 통화와 같은 값을 계속 들고 있다
// (구버전 화면·데이터 호환).
//
// 기록(지출·충전·환전·ATM·잔액이전)의 cur 는 통화 코드다. 없으면 주 통화로 본다 —
// 구버전 데이터가 전부 그렇다. 이 규칙 덕분에 저장된 데이터를 고쳐 쓸 필요가 없다.
//
// 회비(deposits)의 cur 만 예외로 'KRW' | 'LOCAL' | 통화코드 세 가지다.
// 'LOCAL' 은 구버전이 쓰던 값이고 주 통화를 뜻한다.

// 여행의 통화 목록. 항상 최소 한 개를 돌려준다.
export function tripCurrencies(trip) {
  const list = trip && Array.isArray(trip.currencies) ? trip.currencies.filter(Boolean) : [];
  if (list.length) return list;
  return trip && trip.country ? [trip.country] : [];
}

// 주 통화 (구버전에서는 trip.country 하나뿐이었다)
export function primaryCurrency(trip) {
  return tripCurrencies(trip)[0] || null;
}

// 코드가 없는 구버전·테스트 데이터도 있어 항상 문자열로 맞춘다 (undefined면 비교가 어긋난다).
export function primaryCode(trip) {
  const c = primaryCurrency(trip);
  return (c && c.code) || '';
}

// 코드로 통화를 찾는다. 못 찾으면 주 통화로 떨어진다 —
// 데이터에 남아 있는 통화를 여행에서 지웠을 때 화면이 깨지지 않게 한다.
export function currencyOf(trip, code) {
  if (!code) return primaryCurrency(trip);
  const hit = tripCurrencies(trip).find(c => c && c.code === code);
  return hit || primaryCurrency(trip);
}

// 기록 한 건의 통화 코드. cur 가 없으면 주 통화.
export function codeOfRecord(item, trip) {
  return (item && item.cur) || primaryCode(trip);
}

// 회비 한 건의 통화 코드. 원화 납부면 'KRW'.
// 'LOCAL' 은 구버전 값이라 주 통화로 옮겨 읽는다.
export function codeOfDeposit(dep, trip) {
  const cur = dep && dep.cur;
  if (!cur || cur === 'KRW') return 'KRW';
  if (cur === 'LOCAL') return primaryCode(trip);
  return cur;
}

// 그 통화의 기록만 고른다 (cur 없는 구버전 기록은 주 통화로 본다)
export function filterByCurrency(items, trip, code) {
  return (items || []).filter(i => codeOfRecord(i, trip) === code);
}

// 통화를 여행에서 뺄 수 있는지. 기록이 하나라도 있으면 못 뺀다 (참석자 삭제 규칙과 같다).
// 주 통화는 언제나 못 뺀다.
export function currencyHasData(trip, code, data = {}) {
  if (!code || code === primaryCode(trip)) return true;
  const { expenses = [], charges = [], exchanges = [], atms = [], refunds = [], deposits = [] } = data;
  const used = (arr) => arr.some(i => codeOfRecord(i, trip) === code);
  return used(expenses) || used(charges) || used(exchanges) || used(atms) || used(refunds)
    || deposits.some(d => codeOfDeposit(d, trip) === code);
}
