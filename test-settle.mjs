import { computeSettlement, getAvgRate, getAvgRates, checkFixedSplit, checkRatioSplit, normalizeRatio, expenseKrw, makeToKrw, makeToKrwMulti } from './settle.js';

let pass = 0, fail = 0;
function eq(label, got, exp) {
  const ok = got === exp;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${got} exp=${exp}`);
  ok ? pass++ : fail++;
}
function netOf(r, name) { return r.perMember.find(p => p.name === name).net; }

const M = ['A', 'B', 'C', 'D'];
const dep = (m, amt) => ({ mem: m, amt, krwEquiv: amt });

// 1) 회비 동일 + 전원 균등 → net 0
let r = computeSettlement({
  members: M,
  deposits: M.map(m => dep(m, 100)),
  krwExps: [{ name: '식사', amt: 400 }],
});
eq('1 equal A', netOf(r, 'A'), 0);
eq('1 equal D', netOf(r, 'D'), 0);

// 2) 불균등 회비: A가 더 냄 → A가 더 돌려받음
r = computeSettlement({
  members: M,
  deposits: [dep('A', 250), dep('B', 50), dep('C', 50), dep('D', 50)],
  krwExps: [{ name: '식사', amt: 400 }], // 각 100 부담
});
eq('2 uneven A (+150)', netOf(r, 'A'), 150);   // 250-100
eq('2 uneven B (-50)',  netOf(r, 'B'), -50);   // 50-100
eq('2 leftover 0', r.totalLeftover, 0);

// 3) 면제(참여자 제외): 렌트카 300, A·B·C만
r = computeSettlement({
  members: M,
  deposits: M.map(m => dep(m, 100)),
  krwExps: [{ name: '렌트카', amt: 300, participants: ['A', 'B', 'C'] }],
});
eq('3 exclude A (net 0)', netOf(r, 'A'), 0);    // 100-100
eq('3 exclude D (+100)', netOf(r, 'D'), 100);   // 100-0

// 4) 비율: 지출 300, A 0.5 : 나머지 1 (A 운전할인)
r = computeSettlement({
  members: M,
  deposits: M.map(m => dep(m, 75)),
  krwExps: [{ name: '렌트카', amt: 300, split: { mode: 'ratio', values: { A: 0.5, B: 1, C: 1, D: 1 } } }],
});
// 정확한 몫 A=42.86, B/C/D=85.71 → 반올림 43/86/86/86=301, 잔여 -1은 순환 배정으로 A가 흡수 → 42
eq('4 ratio A net', netOf(r, 'A'), 33);   // 75 - 42
eq('4 ratio B net', netOf(r, 'B'), -11);  // 75 - 86
eq('4 ratio 부담합=지출', r.perMember.reduce((s, p) => s + p.owed, 0), 300);

// 5) 배수(인분): 지출 300, A 2인분 : 나머지 1인분 (총 5인분→60/인분)
r = computeSettlement({
  members: M,
  krwExps: [{ name: '고기', amt: 300, split: { mode: 'shares', values: { A: 2, B: 1, C: 1, D: 1 } } }],
});
eq('5 shares A owes 120 (net -120)', netOf(r, 'A'), -120);
eq('5 shares B owes 60 (net -60)',  netOf(r, 'B'), -60);

// 6) 고정액: 지출 300, A 150 고정, 나머지 50씩
r = computeSettlement({
  members: M,
  krwExps: [{ name: '선물', amt: 300, split: { mode: 'fixed', values: { A: 150, B: 50, C: 50, D: 50 } } }],
});
eq('6 fixed A (-150)', netOf(r, 'A'), -150);
eq('6 fixed B (-50)',  netOf(r, 'B'), -50);

// 7) 기존 데이터 호환: participants/split 없음 → 전원 균등
r = computeSettlement({
  members: ['홍길동', '김영희'],
  deposits: [dep('홍길동', 1000), dep('김영희', 1000)],
  krwExps: [{ name: '숙박', amt: 600 }],
});
eq('7 compat 홍길동', netOf(r, '홍길동'), 700);
eq('7 compat 김영희', netOf(r, '김영희'), 700);

// 8) 외화 회비는 '현재 평균환율'로 실시간 환산 (저장값 무시)
//    JPY(r100): ¥10,000 회비, 저장 당시 krwEquiv는 옛 환율(900) 기준 90,000이었다고 가정
const oldSaved = { mem: 'A', cur: 'LOCAL', amt: 10000, rate: 900, krwEquiv: 90000 };
r = computeSettlement({
  members: ['A', 'B'],
  deposits: [oldSaved],
  avgRate: 930, r100: true,   // 이후 충전으로 평균환율이 930으로 변함
});
eq('8 외화회비 평균환율 반영(93,000)', r.perMember.find(p => p.name === 'A').paidIn, 93000);

// 9) 원화 회비는 그대로
r = computeSettlement({
  members: ['A'],
  deposits: [{ mem: 'A', cur: 'KRW', amt: 100000, krwEquiv: 100000 }],
  avgRate: 930, r100: true,
});
eq('9 원화회비 불변', r.perMember[0].paidIn, 100000);

// 10) 비율 잔여 순환 배정: 같은 지출을 여러 건 넣어도 특정인에게 몰리지 않아야 함
{
  const M3 = ['A', 'B', 'C'];
  const one = { name: '나눔', amt: 100, split: { mode: 'ratio', values: { A: 1, B: 1, C: 1 } } };
  const many = Array.from({ length: 9 }, () => ({ ...one }));
  const rr = computeSettlement({ members: M3, krwExps: many });
  const owedList = rr.perMember.map(p => p.owed);
  const spread = Math.max(...owedList) - Math.min(...owedList);
  const total = owedList.reduce((s, v) => s + v, 0);
  eq('10 순환배정 합계(900)', total, 900);
  eq('10 순환배정 편차 ≤ 2원', spread <= 2, true);
}

// 11) 평균환율 단일 출처: 충전·환전 rate의 단순 평균
{
  const trip = { country: { exRate: '930', r100: true } };
  const avg = getAvgRate(trip, [{ rate: 940 }, { rate: 920 }], [{ rate: 900 }]);
  eq('11 평균환율 = (940+920+900)/3', avg, 920);
}

// 12) 실거래(충전·환전) 0건이면 국가 기본환율로 폴백
{
  const trip = { country: { exRate: '930', r100: true } };
  eq('12 폴백 = country.exRate', getAvgRate(trip, [], []), 930);
  eq('12 인자 생략도 동일', getAvgRate(trip), 930);
}

// 13) 실거래도 기본환율도 없으면 0 (외화 회비 입력이 막히는 조건)
eq('13 기본환율 없으면 0', getAvgRate({ country: {} }, [], []), 0);

// 14) 회귀: 충전·환전 0건 여행에서 외화 회비가 0원으로 잡히면 안 된다.
//     A는 외화 현금 ¥10,000(≈93,000원), B는 원화 93,000원 납부 → 둘의 순액이 같아야 한다.
{
  const trip = { country: { exRate: '930', r100: true } };
  const rr = computeSettlement({
    members: ['A', 'B'],
    deposits: [
      { mem: 'A', cur: 'LOCAL', amt: 10000, krwEquiv: 93000 },
      { mem: 'B', cur: 'KRW',   amt: 93000, krwEquiv: 93000 },
    ],
    krwExps: [{ name: '식사', amt: 100000 }],
    avgRate: getAvgRate(trip, [], []),
    r100: true,
  });
  eq('14 외화회비 A paidIn', rr.perMember.find(p => p.name === 'A').paidIn, 93000);
  eq('14 A·B 순액 동일', netOf(rr, 'A'), netOf(rr, 'B'));
}

// 15) 고정액 합계 검증 — 합계가 지출액과 다르면 저장을 막는다
{
  const fixed = (values) => ({ participants: ['A', 'B', 'C'], split: { mode: 'fixed', values } });
  eq('15 합계 일치 → 통과', checkFixedSplit(fixed({ A: 40000, B: 30000, C: 30000 }), 100000).ok, true);

  const short = checkFixedSplit(fixed({ A: 30000, B: 30000, C: 30000 }), 100000);
  eq('15 부족 → 차단',   short.ok, false);
  eq('15 부족 차액(+)',  short.diff, 10000);

  const over = checkFixedSplit(fixed({ A: 50000, B: 50000, C: 50000 }), 100000);
  eq('15 초과 → 차단',   over.ok, false);
  eq('15 초과 차액(−)',  over.diff, -50000);

  // 제외된 사람의 값은 합계에 넣지 않는다
  const excluded = { participants: ['A', 'B'], split: { mode: 'fixed', values: { A: 50000, B: 50000, C: 99999 } } };
  eq('15 제외자 값 무시', checkFixedSplit(excluded, 100000).ok, true);
}

// 16) 균등·비율·미설정은 검증 대상이 아니다 (엔진이 합계를 맞춰 준다)
eq('16 균등 통과', checkFixedSplit({ participants: ['A', 'B'], split: { mode: 'equal' } }, 100000).ok, true);
eq('16 비율 90%도 통과', checkFixedSplit({ participants: ['A', 'B'], split: { mode: 'ratio', values: { A: 45, B: 45 } } }, 100000).ok, true);
eq('16 split 없으면 통과', checkFixedSplit(null, 100000).ok, true);
eq('16 금액 미입력은 통과', checkFixedSplit({ participants: ['A'], split: { mode: 'fixed', values: { A: 10 } } }, 0).ok, true);

// 17) 비율 합계는 정확히 100%여야 한다 (입력값 = 실제 부담률 보장)
{
  const ratio = (values, parts = ['A', 'B', 'C']) => ({ participants: parts, split: { mode: 'ratio', values } });
  eq('17 합계 100 → 통과', checkRatioSplit(ratio({ A: 50, B: 30, C: 20 })).ok, true);

  const short = checkRatioSplit(ratio({ A: 30, B: 30, C: 30 }));
  eq('17 합계 90 → 차단',  short.ok, false);
  eq('17 부족분 10%',      short.diff, 10);

  const over = checkRatioSplit(ratio({ A: 50, B: 50, C: 50 }));
  eq('17 합계 150 → 차단', over.ok, false);
  eq('17 초과분 -50%',     over.diff, -50);

  eq('17 소수 합계 100 통과', checkRatioSplit(ratio({ A: 33.34, B: 33.33, C: 33.33 })).ok, true);
  eq('17 균등·고정액은 대상 아님', checkRatioSplit({ participants: ['A'], split: { mode: 'equal' } }).ok, true);
}

// 18) 100%로 맞추기 — 비는 유지하고 합계는 정확히 100
{
  const sum = (o) => Math.round(Object.values(o).reduce((s, v) => s + Number(v), 0) * 100) / 100;

  const even = normalizeRatio(['A', 'B', 'C'], {});
  eq('18 값 없으면 균등 → 합계 100', sum(even), 100);
  eq('18 균등 A 33.34', Number(even.A), 33.34);
  eq('18 균등 C 33.33', Number(even.C), 33.33);

  const weights = normalizeRatio(['A', 'B', 'C'], { A: 2, B: 1, C: 1 });
  eq('18 배수 2:1:1 → A 50', Number(weights.A), 50);
  eq('18 배수 2:1:1 → B 25', Number(weights.B), 25);
  eq('18 배수 합계 100', sum(weights), 100);

  const six = normalizeRatio(['A', 'B', 'C', 'D', 'E', 'F'], {});
  eq('18 6명도 합계 100', sum(six), 100);

  // 정규화한 값은 곧바로 검증을 통과해야 한다
  eq('18 정규화 → 검증 통과',
    checkRatioSplit({ participants: ['A', 'B', 'C'], split: { mode: 'ratio', values: weights } }).ok, true);
}

// 19) 정규화한 비율로 실제 정산이 의도대로 나온다 (2:1:1 → 50/25/25)
{
  const parts = ['A', 'B', 'C'];
  const values = normalizeRatio(parts, { A: 2, B: 1, C: 1 });
  const rr = computeSettlement({
    members: parts,
    krwExps: [{ name: '지출', amt: 100000, participants: parts, split: { mode: 'ratio', values } }],
  });
  eq('19 A 부담 50,000', rr.perMember.find(p => p.name === 'A').owed, 50000);
  eq('19 B 부담 25,000', rr.perMember.find(p => p.name === 'B').owed, 25000);
  eq('19 부담 합계 = 지출액', rr.perMember.reduce((s, p) => s + p.owed, 0), 100000);
}

// 20) 외화 고정액: 건별 환산 반올림으로 새는 잔여를 보정한다 (합계가 지출액과 같을 때만)
{
  const RATE = 929.3971428571428; // 샘플 여행 평균환율 (100¥ 기준)
  const toKrw = (v) => Math.round((v * RATE) / 100);
  const parts = ['A', 'B'];

  // 12,000 + 8,000 = 20,000 → 사용자 의도는 전액 분배. 건별 환산하면 1원이 더 잡힌다.
  const matched = computeSettlement({
    members: parts, r100: true, avgRate: RATE,
    expenses: [{ name: '고정액', amt: 20000, participants: parts,
      split: { mode: 'fixed', values: { A: 12000, B: 8000 } } }],
  });
  eq('20 외화 고정액 부담합계 = 지출 환산액',
    matched.perMember.reduce((s, p) => s + p.owed, 0), toKrw(20000));
  eq('20 보정 전이었다면 1원 초과였음', toKrw(12000) + toKrw(8000) - toKrw(20000), 1);

  // 합계가 애초에 지출액과 다르면 손대지 않는다 (검증에서 걸러야 할 데이터를 숨기지 않음)
  const mismatched = computeSettlement({
    members: parts, r100: true, avgRate: RATE,
    expenses: [{ name: '고정액', amt: 20000, participants: parts,
      split: { mode: 'fixed', values: { A: 12000, B: 7000 } } }],
  });
  eq('20 합계 불일치는 보정 안 함',
    mismatched.perMember.reduce((s, p) => s + p.owed, 0), toKrw(12000) + toKrw(7000));

  // 원화 고정액은 환산이 없으므로 종전대로 그대로 유지
  const krw = computeSettlement({
    members: parts,
    krwExps: [{ name: '고정액', amt: 100000, participants: parts,
      split: { mode: 'fixed', values: { A: 30000, B: 30000 } } }],
  });
  eq('20 원화 고정액은 그대로', krw.perMember.reduce((s, p) => s + p.owed, 0), 60000);
}

// 21) 신용카드 확정 원화(krwActual): 그 지출만 실제 청구액 기준으로 환산
{
  const RATE = 930;           // 100엔 = 930원
  const conv = makeToKrw(RATE, true);
  const parts = ['A', 'B'];
  const est = conv(10000);    // 평균환율 추정액 93,000

  // 확정 원화가 없으면 종전대로 평균환율 추정
  const pending = computeSettlement({
    members: parts, r100: true, avgRate: RATE,
    expenses: [{ name: '호텔', amt: 10000, pay: '신용카드', participants: parts }],
  });
  eq('21 확정 전엔 평균환율 추정', pending.perMember.reduce((s, p) => s + p.owed, 0), est);

  // 확정 원화가 있으면 그 금액이 부담 합계
  const fixedRate = computeSettlement({
    members: parts, r100: true, avgRate: RATE,
    expenses: [{ name: '호텔', amt: 10000, pay: '신용카드', krwActual: 100000, participants: parts }],
  });
  eq('21 확정 원화가 부담 합계', fixedRate.perMember.reduce((s, p) => s + p.owed, 0), 100000);
  eq('21 확정 원화 균등 A', netOf(fixedRate, 'A'), -50000);

  // 확정 원화 + 고정액 분담: 외화로 넣은 고정액도 실효 환율로 환산되고 합계가 정확히 맞는다
  const withFixed = computeSettlement({
    members: parts, r100: true, avgRate: RATE,
    expenses: [{ name: '호텔', amt: 10000, pay: '신용카드', krwActual: 100000, participants: parts,
      split: { mode: 'fixed', values: { A: 6000, B: 4000 } } }],
  });
  eq('21 확정+고정액 합계', withFixed.perMember.reduce((s, p) => s + p.owed, 0), 100000);
  eq('21 확정+고정액 A 부담', withFixed.perMember.find(p => p.name === 'A').owed, 60000);

  // 값이 없거나 0이면 추정으로 폴백 (구버전 데이터 호환)
  eq('21 krwActual 0은 추정', expenseKrw({ amt: 10000, krwActual: 0 }, conv), est);
  eq('21 krwActual 없으면 추정', expenseKrw({ amt: 10000 }, conv), est);
  eq('21 krwActual 있으면 그 값', expenseKrw({ amt: 10000, krwActual: 100000 }, conv), 100000);

  // 원화 지출에는 영향 없음
  const krwOnly = computeSettlement({
    members: parts,
    krwExps: [{ name: '원화', amt: 50000, krwActual: 999999, participants: parts }],
  });
  eq('21 원화 지출은 krwActual 무시', krwOnly.perMember.reduce((s, p) => s + p.owed, 0), 50000);
}

// 22) 다통화 — 한 여행에 통화가 여럿 (스위스 CHF + 이탈리아 EUR 경유 여행)
{
  const CHF = { code: 'CHF', sym: 'CHF', r100: false, exRate: '1560' };
  const EUR = { code: 'EUR', sym: '€',   r100: false, exRate: '1500' };
  const trip = { country: CHF, currencies: [CHF, EUR] };
  const parts = ['A', 'B'];

  // 통화별 충전·환전. cur 없는 건은 주 통화(CHF)로 읽힌다.
  const charges   = [{ krw: 156000, local: 100, rate: 1560 }];              // CHF (cur 생략)
  const exchanges = [{ krw: 150000, local: 100, rate: 1500, cur: 'EUR' }];  // EUR

  const rates = getAvgRates(trip, charges, exchanges);
  eq('22 CHF 평균환율', rates.CHF, 1560);
  eq('22 EUR 평균환율', rates.EUR, 1500);

  // 통화별 기록이 0건이면 그 통화의 기본환율로 폴백
  const noneRates = getAvgRates(trip, [], []);
  eq('22 CHF 폴백', noneRates.CHF, 1560);
  eq('22 EUR 폴백', noneRates.EUR, 1500);

  const toKrw = makeToKrwMulti(trip, charges, exchanges);
  eq('22 CHF 환산', toKrw(10, 'CHF'), 15600);
  eq('22 EUR 환산', toKrw(10, 'EUR'), 15000);
  eq('22 코드 생략 = 주 통화', toKrw(10), 15600);

  // 정산: 통화가 섞인 지출이 각자 환율로 환산돼 합산된다
  const r = computeSettlement({
    members: parts,
    trip,
    toKrw,
    deposits: [{ mem: 'A', cur: 'KRW', amt: 100000, krwEquiv: 100000 }],
    expenses: [
      { name: '스위스 호텔', amt: 100, participants: parts },              // CHF 156,000
      { name: '이탈리아 식사', amt: 100, cur: 'EUR', participants: parts }, // EUR 150,000
    ],
  });
  eq('22 A 부담', r.perMember.find(p => p.name === 'A').owed, 153000);
  eq('22 B 부담', r.perMember.find(p => p.name === 'B').owed, 153000);
  eq('22 부담 합계 = 두 통화 환산 합', r.perMember.reduce((s, p) => s + p.owed, 0), 306000);
  eq('22 A 순액', r.perMember.find(p => p.name === 'A').net, 100000 - 153000);

  // 외화 회비도 통화별로 환산된다
  const r2 = computeSettlement({
    members: parts,
    trip,
    toKrw,
    deposits: [{ mem: 'A', cur: 'EUR', amt: 100 }, { mem: 'B', cur: 'LOCAL', amt: 100 }],
  });
  eq('22 EUR 회비 환산', r2.perMember.find(p => p.name === 'A').paidIn, 150000);
  eq('22 LOCAL 회비 = 주 통화', r2.perMember.find(p => p.name === 'B').paidIn, 156000);

  // 확정 원화는 통화와 무관하게 그 건만 실효 환율을 쓴다
  const r3 = computeSettlement({
    members: parts,
    trip,
    toKrw,
    expenses: [{ name: '이탈리아 카드', amt: 100, cur: 'EUR', krwActual: 148000, participants: parts }],
  });
  eq('22 확정 원화 우선', r3.perMember.reduce((s, p) => s + p.owed, 0), 148000);
}

// 23) 다통화 — r100 통화가 섞여도 통화별로 적용된다 (일본 JPY + 유럽 EUR)
{
  const JPY = { code: 'JPY', sym: '¥', r100: true,  exRate: '930'  };
  const EUR = { code: 'EUR', sym: '€', r100: false, exRate: '1500' };
  const trip = { country: JPY, currencies: [JPY, EUR] };
  const toKrw = makeToKrwMulti(trip, [], []);
  eq('23 JPY는 /100', toKrw(10000, 'JPY'), 93000);
  eq('23 EUR는 그대로', toKrw(100, 'EUR'), 150000);
}

console.log(`\n== ${pass} passed, ${fail} failed ==`);
process.exit(fail ? 1 : 0);
