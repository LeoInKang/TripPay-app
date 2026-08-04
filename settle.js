// settle.js — 개인별 정산 엔진 (b: 유연한 분담)
// 순액 = 회비 − (참여한 지출의 내 몫)
// 분담방식: equal(균등) | ratio(비율) | shares(배수) | fixed(고정액)
// participants 없으면 전원, split 없으면 균등 (기존 데이터 호환)

// 여행 평균환율 — 회비·지출·잔액 환산의 유일한 기준.
// 충전·환전 거래 rate의 단순 평균. 실거래가 하나도 없으면 국가 기본환율로 폴백한다.
// (폴백이 없으면 충전·환전 0건인 여행에서 외화 회비가 0원으로 계산돼 순액이 뒤집힌다)
// 화면마다 따로 계산하지 말고 반드시 이 함수를 쓸 것.
export function getAvgRate(trip, charges = [], exchanges = []) {
  const fx = [...(charges || []), ...(exchanges || [])];
  if (fx.length) return fx.reduce((s, i) => s + (i.rate || 0), 0) / fx.length;
  return parseFloat(trip?.country?.exRate) || 0;
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

export function makeToKrw(avgRate, r100) {
  return (v) => (avgRate > 0 ? Math.round((v * avgRate) / (r100 ? 100 : 1)) : 0);
}

// 한 지출에서 특정 멤버의 부담액(원화)
export function shareOfKrw(exp, member, allMembers, toKrw, isFx) {
  const participants =
    exp.participants && exp.participants.length ? exp.participants : allMembers;
  if (!participants.includes(member)) return 0;

  const split = exp.split || { mode: 'equal' };
  const amtKrw = isFx ? toKrw(exp.amt) : exp.amt;

  if (split.mode === 'fixed') {
    const raw = (split.values && Number(split.values[member])) || 0;
    return isFx ? toKrw(raw) : Math.round(raw);
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
// { members, deposits, expenses, krwExps, avgRate, r100 } → { perMember, totalLeftover }
export function computeSettlement({
  members = [],
  deposits = [],
  expenses = [],
  krwExps = [],
  avgRate = 0,
  r100 = false,
}) {
  const toKrw = makeToKrw(avgRate, r100);
  const paidIn = {};
  const owed = {};
  members.forEach((m) => {
    paidIn[m] = 0;
    owed[m] = 0;
  });

  // 회비(입금). 외화 회비는 저장값이 아니라 '현재 평균환율'로 환산해 기준을 통일한다.
  deposits.forEach((d) => {
    if (paidIn[d.mem] == null) return;
    paidIn[d.mem] += d.cur === 'LOCAL'
      ? toKrw(d.amt || 0)
      : (d.krwEquiv || d.amt || 0);
  });

  // 지출 적용 (외화 + 원화 공통 로직)
  // 반올림 잔여는 특정인에게 몰리지 않도록 지출마다 순환 배정한다.
  let rotation = 0;
  const applyExp = (exp, isFx) => {
    const amtKrw = isFx ? toKrw(exp.amt) : Math.round(exp.amt || 0);
    const parts = (exp.participants && exp.participants.length)
      ? members.filter((m) => exp.participants.includes(m))
      : [...members];
    if (!parts.length) return;

    const shares = parts.map((m) => shareOfKrw(exp, m, members, toKrw, isFx));
    const mode = (exp.split && exp.split.mode) || 'equal';
    if (mode !== 'fixed') {
      // 균등·비율: 반올림 잔여를 참여자에게 순환 배정해 합계를 지출액과 정확히 맞춘다.
      // (고정액은 사용자가 정한 금액을 그대로 유지)
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
