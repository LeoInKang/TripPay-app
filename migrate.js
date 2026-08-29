// 저장·반입된 여행 데이터를 현재 스키마로 맞춘다.
// 읽어 들이는 모든 경로에서 한 번씩 통과시킨다: storage.loadTripData(기기 저장분),
// transfer.importTripFile(JSON 파일), ImportAIScreen(AI 결과).
// 규칙: 원본을 변형하지 않고 바뀐 부분만 새 객체로 돌려준다. 바뀔 게 없으면 같은 참조를 그대로 반환한다.

import { PAY_CARD, PAY_CARD_LEGACY } from './constants';

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

// 참석자가 하나도 없으면 넣는 기본값.
// AI가 만든 JSON에는 참석자가 빠질 수 있는데, 화면 여러 곳이 trip.members를 무방비로 읽어
// 비어 있으면 앱이 죽는다. 프롬프트로 막을 일이 아니라 여기서 채운다(사용자가 설정에서 고친다).
const DEFAULT_MEMBERS = ['총무'];

export function migrateTripData(data) {
  if (!data || typeof data !== 'object') return data;

  const expenses = renamePay(data.expenses);
  const krwExps  = renamePay(data.krwExps);

  let trip = data.trip;
  if (trip && Array.isArray(trip.payMethods) && trip.payMethods.includes(PAY_CARD_LEGACY)) {
    trip = { ...trip, payMethods: trip.payMethods.map((m) => (m === PAY_CARD_LEGACY ? PAY_CARD : m)) };
  }
  if (trip && (!Array.isArray(trip.members) || trip.members.length === 0)) {
    trip = { ...trip, members: [...DEFAULT_MEMBERS] };
  }
  // 다통화 여행: 통화 목록의 첫 항목이 주 통화다. 구버전에는 trip.country 하나뿐이라 그걸로 채운다.
  // 기록(지출·충전 등)의 cur가 비어 있으면 주 통화로 읽으므로 저장된 데이터는 손대지 않는다.
  if (trip && trip.country && (!Array.isArray(trip.currencies) || trip.currencies.length === 0)) {
    trip = { ...trip, currencies: [trip.country] };
  }

  if (expenses === data.expenses && krwExps === data.krwExps && trip === data.trip) return data;
  return { ...data, trip, expenses, krwExps };
}
