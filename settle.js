// settle.js — 개인별 정산 엔진 (b: 유연한 분담)
import { tripCurrencies, primaryCode, codeOfRecord, codeOfDeposit } from './currency.js';

// 순액 = 회비 − (참여한 지출의 내 몫)
// 분담방식: equal(균등) | ratio(비율) | shares(배수) | fixed(고정액)
// participants 없으면 전원, split 없으면 균등 (기존 데이터 호환)
// 외화 지출의 원화 환산은 평균환율이 기준이나, 신용카드 건은 확정 원화(krwActual)가 있으면 그 값을 쓴다.

// 여행 평균환율 — 회비·지출·잔액 환산의 유일한 기준.
// 충전·환전 거래 rate의 단순 평균. 실거래가 하나도 없으면 국가 기본환율로 폴백한다.
// (폴백이 없으면 충전·환전 0건인 여행에서 외화 회비가 0원으로 계산돼 순액이 뒤집힌다)
// 화면마다 따로 계산하지 말고 반드시 이 함수를 쓸 것.
export function getAvgRate(trip, charges = [], exchanges = []) {
  return getAvgRates(trip, charges, exchanges)[primaryCode(trip)] ?? fallbackRate(trip?.country);
}

function fallbackRate(cur) {
  return parseFloat(cur?.exRate) || 0;
}

// 통화별 평균환율. 여행에 통화가 여럿이면 통화마다 따로 낸다.
// 그 통화의 충전·환전이 0건이면 그 통화의 기본환율로 폴백한다 (단일 통화 때와 같은 규칙).
// → { CHF: 1560, EUR: 1500 }
export function getAvgRates(trip, charges = [], exchanges = []) {
  const fx = [...(charges || []), ...(exchanges || [])];
  const out = {};
  for (const cur of tripCurrencies(trip)) {
    if (!cur) continue;
    // code가 없는 여행 데이터도 있다(구버전·테스트). 그때는 빈 코드가 주 통화 키가 된다.
    const code = cur.code || '';
    const mine = fx.filter((i) => codeOfRecord(i, trip) === code);
    out[code] = mine.length
      ? mine.reduce((s, i) => s + (i.rate || 0), 0) / mine.length
      : fallbackRate(cur);
  }
  return out;
}

// 고정액 분담 검증 — 부담 합계가 지출액과 다르면 정산이 조용히 어긋나므로 저장 전에 막는다.
// 균등·비율은 검증 대상이 아니다: 균등은 잔여를 순환 배정하고, 비율은 총 가중치로 정규화하므로
// 합계가 100%가 아니어도 부담 합계는 항상 지출액과 일치한다. 고정액만 그대로 두기 때문에 어긋난다.
// → { ok: true } | { ok: false, sum, amount, diff }   diff > 0 부족 / diff < 0 초과
export function checkFixedSplit(value, amount) {
  const split = value && value.split;
  if (!split || split.mode !== 'fixed') return { ok: true };

  const participants = (value.participants && value.participants.length) ? value.participants : [];
  const vals = split.values || {};
  const sum = participants.reduce((s, p) => s + (Number(vals[p]) || 0), 0);
  const amt = Number(amount) || 0;
  if (!amt) return { ok: true }; // 금액 미입력은 금액 검증에서 걸린다

  const diff = Math.round((amt - sum) * 100) / 100;
  return diff === 0 ? { ok: true } : { ok: false, sum, amount: amt, diff };
}

// 비율 분담 검증 — 합계는 정확히 100%여야 한다.
// 엔진은 총 가중치로 정규화하므로 합계가 90이어도 계산은 맞지만, 30을 넣은 사람이 실제로는
// 33.3%를 물어 입력값과 실제가 어긋난다. 고정액과 같은 규칙("합계를 맞춰라")으로 통일한다.
// → { ok: true } | { ok: false, sum, diff }   diff > 0 부족 / diff < 0 초과
export function checkRatioSplit(value) {
  const split = value && value.split;
  if (!split || split.mode !== 'ratio') return { ok: true };

  const participants = (value.participants && value.participants.length) ? value.participants : [];
  const vals = split.values || {};
  const sum = Math.round(participants.reduce((s, p) => s + (Number(vals[p]) || 0), 0) * 100) / 100;
  if (sum === 100) return { ok: true };
  return { ok: false, sum, diff: Math.round((100 - sum) * 100) / 100 };
}

// 비율 값을 비(比)는 유지한 채 합계 100으로 정규화. 소수 둘째 자리까지, 합계는 정확히 100.
// 값이 하나도 없으면 균등으로 시작한다. (1/1/1 → 33.34/33.33/33.33, 2/1/1 → 50/25/25)
export function normalizeRatio(participants = [], values = {}) {
  const n = participants.length;
  if (!n) return {};

  const raw = participants.map((p) => Number(values[p]) || 0);
  const total = raw.reduce((s, v) => s + v, 0);
  const base = total > 0 ? raw.map((v) => (v * 100) / total) : raw.map(() => 100 / n);

  // 0.01 단위로 내린 뒤 잔여를 앞에서부터 배정해 합계를 정확히 100.00으로 맞춘다
  const cents = base.map((v) => Math.floor(v * 100));
  let rest = 10000 - cents.reduce((s, v) => s + v, 0);
  for (let i = 0; rest > 0; i = (i + 1) % n) { cents[i] += 1; rest--; }

  const out = {};
  participants.forEach((p, i) => { out[p] = String(cents[i] / 100); });
  return out;
}

// 단일 통화 환산기. 둘째 인자(통화 코드)는 무시하므로 다통화 환산기와 자리를 바꿔 끼울 수 있다.
export function makeToKrw(avgRate, r100) {
  return (v) => (avgRate > 0 ? Math.round((v * avgRate) / (r100 ? 100 : 1)) : 0);
}

// 다통화 환산기 — (금액, 통화코드) → 원화. 코드를 생략하면 주 통화로 본다.
// 화면·엔진 어디서든 이 하나만 쓰면 통화가 몇 개든 같은 기준으로 환산된다.
export function makeToKrwMulti(trip, charges = [], exchanges = []) {
  const rates = getAvgRates(trip, charges, exchanges);
  const r100 = {};
  for (const cur of tripCurrencies(trip)) {
    if (cur) r100[cur.code || ''] = !!cur.r100;
  }
  const home = primaryCode(trip);
  return (v, code) => {
    const key = code || home;
    const rate = rates[key] || 0;
    if (rate <= 0) return 0;
    return Math.round((v * rate) / (r100[key] ? 100 : 1));
  };
}

// 한 외화 지출 전용 환산기.
// 신용카드 결제는 원화 청구액이 며칠 뒤에 확정되므로, 확정 원화(krwActual)를 넣으면
// 그 건만 실제 청구액 기준으로 환산한다(= 그 지출에만 적용되는 실효 환율).
// 없으면 여행 평균환율(toKrw)로 추정한다. 외화 금액(amt)은 어느 쪽이든 그대로 보존된다.
export function makeExpToKrw(exp, toKrw) {
  const actual = Number(exp && exp.krwActual) || 0;
  const amt = Number(exp && exp.amt) || 0;
  if (actual > 0 && amt > 0) return (v) => Math.round((v * actual) / amt);
  // 그 지출의 통화를 환산기에 넘긴다. 단일 통화 환산기는 이 인자를 무시하므로 동작이 같다.
  const cur = exp && exp.cur;
  return (v) => toKrw(v, cur);
}

// 외화 지출 1건의 원화 금액 (확정 원화 우선). 잔액·합계 표시가 정산과 같은 값을 쓰도록 공용.
export function expenseKrw(exp, toKrw) {
  return makeExpToKrw(exp, toKrw)(Number(exp && exp.amt) || 0);
}

// 한 지출에서 특정 멤버의 부담액(원화)
export function shareOfKrw(exp, member, allMembers, toKrw, isFx) {
  const participants =
    exp.participants && exp.participants.length ? exp.participants : allMembers;
  if (!participants.includes(member)) return 0;

  const split = exp.split || { mode: 'equal' };
  const conv = isFx ? makeExpToKrw(exp, toKrw) : toKrw;
  const amtKrw = isFx ? conv(exp.amt) : exp.amt;

  if (split.mode === 'fixed') {
    const raw = (split.values && Number(split.values[member])) || 0;
    return isFx ? conv(raw) : Math.round(raw);
  }

  if (split.mode === 'ratio' || split.mode === 'shares') {
    const vals = split.values || {};
    const totalW = participants.reduce((s, p) => s + (Number(vals[p]) || 0), 0);
    const w = Number(vals[member]) || 0;
    if (totalW <= 0) return Math.round(amtKrw / participants.length); // 값 없으면 균등
    return Math.round((amtKrw * w) / totalW);
  }

  // equal
  return Math.round(amtKrw / participants.length);
}

// 개인별 정산 계산
// { members, deposits, expenses, krwExps, avgRate, r100, trip, toKrw } → { perMember, totalLeftover }
//
// 단일 통화: avgRate + r100 을 준다 (기존 호출부 그대로).
// 다통화:    toKrw 에 makeToKrwMulti(trip, charges, exchanges) 를 주고, trip 도 함께 넘긴다.
//            trip 은 외화 회비의 통화를 읽는 데만 쓴다.
export function computeSettlement({
  members = [],
  deposits = [],
  expenses = [],
  krwExps = [],
  avgRate = 0,
  r100 = false,
  trip = null,
  toKrw: toKrwIn = null,
}) {
  const toKrw = toKrwIn || makeToKrw(avgRate, r100);
  const paidIn = {};
  const owed = {};
  members.forEach((m) => {
    paidIn[m] = 0;
    owed[m] = 0;
  });

  // 회비(입금). 외화 회비는 저장값이 아니라 '현재 평균환율'로 환산해 기준을 통일한다.
  // 통화는 codeOfDeposit이 정한다 — 'KRW'는 원화, 구버전 'LOCAL'은 주 통화, 그 외는 통화 코드.
  deposits.forEach((d) => {
    if (paidIn[d.mem] == null) return;
    const code = trip ? codeOfDeposit(d, trip) : (d.cur === 'LOCAL' ? '' : 'KRW');
    paidIn[d.mem] += code === 'KRW'
      ? (d.krwEquiv || d.amt || 0)
      : toKrw(d.amt || 0, code);
  });

  // 지출 적용 (외화 + 원화 공통 로직)
  // 반올림 잔여는 특정인에게 몰리지 않도록 지출마다 순환 배정한다.
  let rotation = 0;
  const applyExp = (exp, isFx) => {
    const amtKrw = isFx ? expenseKrw(exp, toKrw) : Math.round(exp.amt || 0);
    const parts = (exp.participants && exp.participants.length)
      ? members.filter((m) => exp.participants.includes(m))
      : [...members];
    if (!parts.length) return;

    const shares = parts.map((m) => shareOfKrw(exp, m, members, toKrw, isFx));
    const mode = (exp.split && exp.split.mode) || 'equal';

    // 균등·비율: 반올림 잔여를 참여자에게 순환 배정해 합계를 지출액과 정확히 맞춘다.
    // 고정액: 사용자가 정한 금액을 그대로 두는 게 원칙이지만, 외화는 건별로 환산하면서
    //   생기는 반올림 오차(toKrw(a)+toKrw(b) ≠ toKrw(a+b))까지 떠안게 된다.
    //   그래서 입력 합계가 지출액과 정확히 같을 때만 — 즉 사용자 의도가 "전액 분배"일 때만 —
    //   환산 잔여를 보정한다. 합계가 애초에 안 맞는 데이터는 건드리지 않고 그대로 드러낸다.
    let adjust = mode !== 'fixed';
    if (!adjust && isFx) {
      const vals = (exp.split && exp.split.values) || {};
      const fixedSum = parts.reduce((s, m) => s + (Number(vals[m]) || 0), 0);
      adjust = Math.round(fixedSum * 100) === Math.round((exp.amt || 0) * 100);
    }

    if (adjust) {
      const sum = shares.reduce((s, v) => s + v, 0);
      const diff = amtKrw - sum;
      if (diff !== 0) {
        const step = diff > 0 ? 1 : -1;
        let n = Math.abs(diff);
        while (n > 0) {
          shares[rotation % parts.length] += step;
          rotation++;
          n--;
        }
      }
    }
    rotation++; // 다음 지출은 다른 사람부터 시작

    parts.forEach((m, i) => { owed[m] += shares[i]; });
  };
  expenses.forEach((e) => applyExp(e, true));
  krwExps.forEach((e) => applyExp(e, false));

  const perMember = members.map((m) => ({
    name: m,
    paidIn: paidIn[m],
    owed: owed[m],
    net: paidIn[m] - owed[m], // >0 돌려받음, <0 더 내야 함
  }));

  const totalLeftover = perMember.reduce((s, p) => s + p.net, 0);
  return { perMember, totalLeftover };
}
