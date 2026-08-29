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

// 여행이 거친 나라 목록. 표시용이라 통화가 겹쳐도 그대로 둔다
// (이탈리아·프랑스를 둘 다 넣으면 둘 다 보여야 한다).
export function tripCountries(trip) {
  const list = trip && Array.isArray(trip.countries) ? trip.countries.filter(Boolean) : [];
  if (list.length) return list;
  if (trip && Array.isArray(trip.currencies) && trip.currencies.length) return trip.currencies.filter(Boolean);
  return trip && trip.country ? [trip.country] : [];
}

// 정산에 쓰는 통화 목록. 나라 목록을 통화 코드 기준으로 유일화한 것.
// 이탈리아·프랑스는 한 줄(EUR)로 합쳐진다.
export function tripCurrencies(trip) {
  const seen = new Set();
  const out = [];
  for (const c of tripCountries(trip)) {
    const code = (c && c.code) || '';
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(c);
  }
  return out;
}

// 통화가 안 적힌 기록(cur 없음)을 읽을 때 쓰는 통화.
// 다통화 이전에 만든 여행은 기록에 통화 칸이 없었고, 그때는 여행에 통화가 하나뿐이라
// trip.country 가 곧 통화였다. 그 기록들을 지금도 바르게 읽으려면 이 값이 있어야 한다.
//
// 화면에는 드러내지 않고 바꿀 수단도 두지 않는다 — 바꾸는 순간 옛 기록의 통화가
// 통째로 달라져 정산이 조용히 어긋난다. 새 기록은 통화를 언제나 적으므로 영향을 받지 않는다.
// 목록 순서와도 분리돼 있어 나라를 위아래로 옮겨도 흔들리지 않는다.
// homeCode가 없는 구버전은 종전대로 첫 통화(= trip.country)를 본다.
export function primaryCode(trip) {
  const home = trip && trip.homeCode;
  if (home) return home;
  const first = tripCurrencies(trip)[0];
  return (first && first.code) || '';
}

export function primaryCurrency(trip) {
  return currencyOf(trip, primaryCode(trip));
}

// 코드로 통화를 찾는다. 못 찾으면 주 통화로 떨어진다 —
// 데이터에 남아 있는 통화를 여행에서 지웠을 때 화면이 깨지지 않게 한다.
export function currencyOf(trip, code) {
  const list = tripCurrencies(trip);
  const hit = code ? list.find(c => c && c.code === code) : null;
  if (hit) return hit;
  const home = trip && trip.homeCode;
  return (home && list.find(c => c && c.code === home)) || list[0] || null;
}

// 화면에서 처음 골라 둘 통화. 목록 맨 앞이다.
// 정산 기준(primaryCode)과는 다르다 — 그쪽은 통화가 안 적힌 옛 기록을 읽을 때만 쓴다.
export function defaultCode(trip) {
  const first = tripCurrencies(trip)[0];
  return (first && first.code) || '';
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
// 기록이 없으면 어느 통화든 뺄 수 있다 — 마지막 하나만 남기는 건 화면이 막는다.
export function currencyHasData(trip, code, data = {}) {
  if (!code) return true;
  const { expenses = [], charges = [], exchanges = [], atms = [], refunds = [], deposits = [] } = data;
  const used = (arr) => arr.some(i => codeOfRecord(i, trip) === code);
  return used(expenses) || used(charges) || used(exchanges) || used(atms) || used(refunds)
    || deposits.some(d => codeOfDeposit(d, trip) === code);
}
