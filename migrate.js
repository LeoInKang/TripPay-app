// 저장·반입된 여행 데이터를 현재 스키마로 맞춘다.
// 읽어 들이는 모든 경로에서 한 번씩 통과시킨다: storage.loadTripData(기기 저장분),
// transfer.importTripFile(JSON 파일), ImportAIScreen(AI 결과).
// 규칙: 원본을 변형하지 않고 바뀐 부분만 새 객체로 돌려준다. 바뀔 게 없으면 같은 참조를 그대로 반환한다.

import { PAY_CARD, PAY_CARD_LEGACY } from './constants.js';   // node 테스트에서도 풀리도록 확장자를 붙인다
import { primaryCode } from './currency.js';

// 결제수단 옛 이름(트레블월렛) → 현재 이름(트래블카드)
function renamePay(list) {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const next = list.map((e) => {
    if (e && e.pay === PAY_CARD_LEGACY) { changed = true; return { ...e, pay: PAY_CARD }; }
    return e;
  });
  return changed ? next : list;
}

// 통화가 안 적힌 기록에 그 여행의 기준 통화를 적어 둔다.
//
// 다통화 이전에 만든 기록에는 cur 가 없고, 읽을 때마다 trip.homeCode 로 해석한다.
// 그래서 기준 통화를 건드리면 옛 기록의 통화가 통째로 바뀐다 — 기준 통화를 화면에서
// 걷어낸 이유가 이것이다. 여기서 한 번 적어 두면 기록이 스스로 통화를 말하게 되고
// 그 의존이 사라진다.
//
// **지금 해석하는 값을 그대로 적을 뿐이라 계산 결과는 한 푼도 바뀌지 않는다**
// (회귀 테스트 25번이 이걸 못 박는다). 기준 통화를 못 정하면 아무것도 적지 않는다 —
// 없는 값을 지어내느니 지금처럼 두는 편이 안전하다.
function stampCurrency(list, code) {
  if (!Array.isArray(list) || !code) return list;
  let changed = false;
  const next = list.map((i) => {
    if (!i || i.cur) return i;
    changed = true;
    return { ...i, cur: code };
  });
  return changed ? next : list;
}

// 회비는 규칙이 다르다. cur 는 'KRW' | 'LOCAL'(구버전 = 기준 통화) | 통화코드 세 가지이고,
// **빈 값은 기준 통화가 아니라 원화다**(currency.codeOfDeposit). 지출과 같은 줄 알고
// 외화 코드를 박으면 원화 회비가 외화로 둔갑해 정산이 통째로 어긋난다.
function stampDeposits(list, code) {
  if (!Array.isArray(list)) return list;
  let changed = false;
  const next = list.map((d) => {
    if (!d) return d;
    if (!d.cur) { changed = true; return { ...d, cur: 'KRW' }; }
    if (d.cur === 'LOCAL' && code) { changed = true; return { ...d, cur: code }; }
    return d;
  });
  return changed ? next : list;
}

// 참석자가 하나도 없으면 넣는 기본값.
// AI가 만든 JSON에는 참석자가 빠질 수 있는데, 화면 여러 곳이 trip.members를 무방비로 읽어
// 비어 있으면 앱이 죽는다. 프롬프트로 막을 일이 아니라 여기서 채운다(사용자가 설정에서 고친다).
const DEFAULT_MEMBERS = ['총무'];

export function migrateTripData(data) {
  if (!data || typeof data !== 'object') return data;

  const expenses0 = renamePay(data.expenses);
  const krwExps   = renamePay(data.krwExps);

  let trip = data.trip;
  if (trip && Array.isArray(trip.payMethods) && trip.payMethods.includes(PAY_CARD_LEGACY)) {
    trip = { ...trip, payMethods: trip.payMethods.map((m) => (m === PAY_CARD_LEGACY ? PAY_CARD : m)) };
  }
  if (trip && (!Array.isArray(trip.members) || trip.members.length === 0)) {
    trip = { ...trip, members: [...DEFAULT_MEMBERS] };
  }
  // 다통화 여행: 통화 목록의 첫 항목이 주 통화다. 구버전에는 trip.country 하나뿐이라 그걸로 채운다.
  if (trip && trip.country && (!Array.isArray(trip.currencies) || trip.currencies.length === 0)) {
    trip = { ...trip, currencies: [trip.country] };
  }

  // 통화를 적어 둔다. 기준 통화를 못 정하면(구버전 데이터에 country 조차 없음) 손대지 않는다.
  const code = trip ? primaryCode(trip) : '';
  const expenses  = stampCurrency(expenses0, code);
  const charges   = stampCurrency(data.charges, code);
  const exchanges = stampCurrency(data.exchanges, code);
  const atms      = stampCurrency(data.atms, code);
  const refunds   = stampCurrency(data.refunds, code);
  const deposits  = stampDeposits(data.deposits, code);

  const same = expenses === data.expenses && krwExps === data.krwExps && trip === data.trip
    && charges === data.charges && exchanges === data.exchanges && atms === data.atms
    && refunds === data.refunds && deposits === data.deposits;
  if (same) return data;
  return { ...data, trip, expenses, krwExps, charges, exchanges, atms, refunds, deposits };
}
