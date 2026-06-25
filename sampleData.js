// 실제 여행 데이터 (2026-05-05 일본 골프 투어)
export const SAMPLE_TRIP = {
  id: 'trip_sample',
  name: '일본 골프 투어',
  startDate: '2026-05-05',
  endDate: '2026-05-08',
  note: '야마구치현',
  country: { flag: '🇯🇵', name: '일본', code: 'JPY', sym: '¥', r100: true },
  members: ['강&장', '유&신'],
  payMethods: ['트레블월렛', '현금'],
  splitMode: 'equal',
};

export const SAMPLE_DEPOSITS = [
  { id:1,  mem:'유&신', cur:'KRW',   amt:1200000, rate:null,  krwEquiv:1200000, date:'04-29', note:'' },
  { id:2,  mem:'강&장', cur:'KRW',   amt:1200000, rate:null,  krwEquiv:1200000, date:'04-29', note:'' },
  { id:16, mem:'강&장', cur:'KRW',   amt:400000,  rate:null,  krwEquiv:400000,  date:'05-06', note:'' },
  { id:18, mem:'유&신', cur:'KRW',   amt:400000,  rate:null,  krwEquiv:400000,  date:'05-06', note:'' },
  { id:24, mem:'강&장', cur:'LOCAL', amt:3190,    rate:930,   krwEquiv:29667,   date:'05-08', note:'' },
  { id:25, mem:'유&신', cur:'LOCAL', amt:3190,    rate:930,   krwEquiv:29667,   date:'05-08', note:'' },
];

export const SAMPLE_CHARGES = [
  { id:5,  krw:999995,  local:106472, rate:939.21, date:'05-05', note:'' },
  { id:6,  krw:356587,  local:38170,  rate:934.21, date:'05-05', note:'유&신에게 지급필요' },
  { id:11, krw:599996,  local:64967,  rate:923.54, date:'05-06', note:'' },
  { id:12, krw:24996,   local:2706,   rate:923.73, date:'05-06', note:'' },
  { id:17, krw:299992,  local:32376,  rate:926.59, date:'05-07', note:'' },
  { id:21, krw:299995,  local:32277,  rate:929.44, date:'05-07', note:'' },
];

export const SAMPLE_EXCHANGES = [
  { id:3, krw:418077, local:45000, rate:929.06, date:'04-29', note:'' },
];

export const SAMPLE_EXPENSES = [
  { id:7,  name:'렌트카',       amt:38170, pay:'트레블월렛', date:'05-05', payer:'유&신', note:'유&신에게 지급필요' },
  { id:8,  name:'휴게소 식음료', amt:1020,  pay:'트레블월렛', date:'05-05', payer:'공통',  note:'' },
  { id:9,  name:'숙박비',        amt:87200, pay:'트레블월렛', date:'05-05', payer:'공통',  note:'주차장사용료 1,200엔 포함' },
  { id:10, name:'저녁식대',      amt:8808,  pay:'트레블월렛', date:'05-05', payer:'공통',  note:'MaxValu 마트털이' },
  { id:13, name:'센트럴파크',    amt:55320, pay:'트레블월렛', date:'05-06', payer:'공통',  note:'' },
  { id:14, name:'간식',          amt:1114,  pay:'트레블월렛', date:'05-06', payer:'공통',  note:'코코넛사브레 Big수박바 마카다미아초콜렛' },
  { id:15, name:'스테키미야',    amt:19382, pay:'트레블월렛', date:'05-06', payer:'공통',  note:'등심200g' },
  { id:19, name:'시모노세키골든', amt:19000, pay:'현금',      date:'05-07', payer:'공통',  note:'현금19,000+카드27,750=46,750' },
  { id:20, name:'시모노세키골든', amt:27750, pay:'트레블월렛', date:'05-07', payer:'공통',  note:'현금19,000+카드27,750=46,750' },
  { id:22, name:'스시로',        amt:10950, pay:'트레블월렛', date:'05-07', payer:'공통',  note:'저녁식사 회전초밥집' },
  { id:23, name:'간식',          amt:2344,  pay:'트레블월렛', date:'05-07', payer:'공통',  note:'MaxValu' },
  { id:26, name:'산요국제',      amt:25840, pay:'현금',       date:'05-08', payer:'공통',  note:'' },
  { id:27, name:'공항길 점심',   amt:6380,  pay:'현금',       date:'05-08', payer:'공통',  note:'라멘' },
  { id:28, name:'렌트카 정산',   amt:4704,  pay:'트레블월렛', date:'05-08', payer:'공통',  note:'GAS 2,114 + ETC 2,590' },
];
