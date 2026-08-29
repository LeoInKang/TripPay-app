// balances.js — 잔액 계산 단일 출처
//
// HomeTab과 SettleTab이 같은 20여 줄을 각자 복제해 두고 있었다. 한쪽만 고치면 두 화면의
// 숫자가 어긋나므로 여기로 모은다 (avgRate를 settle.js로 모은 것과 같은 이유).
//
// 계좌는 원화 하나뿐이고, 카드·현금은 통화별로 나뉜다.
//   트래블카드 → 그 통화의 카드 잔액
//   현금       → 그 통화의 현금 잔액
//   신용카드   → 계좌 (통화 무관, 확정 원화가 있으면 그 금액)

import { PAY_CASH, PAY_CREDIT } from './constants';
import { tripCurrencies, codeOfRecord, codeOfDeposit } from './currency.js';
import { expenseKrw } from './settle.js';

const sum = (arr, pick) => (arr || []).reduce((s, i) => s + (Number(pick(i)) || 0), 0);

// 카드 결제 = 현금도 신용카드도 아닌 것. 결제수단이 빈 구버전 데이터는 카드로 본다.
const isCardPay = (e) => e.pay !== PAY_CASH && e.pay !== PAY_CREDIT;

export function computeBalances({
  trip,
  deposits = [], charges = [], exchanges = [], atms = [], refunds = [],
  expenses = [], krwExps = [],
  toKrw,
}) {
  const mine = (arr, code) => (arr || []).filter((i) => codeOfRecord(i, trip) === code);

  // ── 통화별 카드·현금 잔액 ──
  const byCurrency = tripCurrencies(trip).map((cur) => {
    const code = (cur && cur.code) || '';
    const cCharges   = mine(charges, code);
    const cExchanges = mine(exchanges, code);
    const cAtms      = mine(atms, code);
    const cRefunds   = mine(refunds, code);
    const cExpenses  = mine(expenses, code);

    const cardAtm = sum(cAtms, (a) => a.local);
    const cardBal = sum(cCharges, (c) => c.local)
      - sum(cExpenses.filter(isCardPay), (e) => e.amt)
      - sum(cRefunds, (r) => r.local)
      - cardAtm;

    // 외화 회비는 현금으로 들어온 것으로 본다 (기존 규칙 유지)
    const localDeps = sum(deposits.filter((d) => codeOfDeposit(d, trip) === code), (d) => d.amt);
    const cashBal = sum(cExchanges, (e) => e.local) + cardAtm + localDeps
      - sum(cExpenses.filter((e) => e.pay === PAY_CASH), (e) => e.amt);

    return {
      code,
      cur,
      sym: (cur && cur.sym) || '',
      name: (cur && cur.name) || '',
      cardBal,
      cashBal,
      chargeCount: cCharges.length,
      exchangeCount: cExchanges.length,
      atmCount: cAtms.length,
      fxAmt: sum(cExpenses, (e) => e.amt),
    };
  });

  // ── 신용카드 (통화와 무관하게 계좌에서 빠진다) ──
  const creditExps = (expenses || []).filter((e) => e.pay === PAY_CREDIT);
  const creditKrw  = sum(creditExps, (e) => expenseKrw(e, toKrw));
  const pendingCnt = creditExps.filter((e) => !(e.krwActual > 0)).length;

  // ── 계좌 잔액 (원화) ──
  const totalKrwDep = sum(deposits.filter((d) => codeOfDeposit(d, trip) === 'KRW'), (d) => d.krwEquiv || d.amt);
  const chargedKrw   = sum(charges, (c) => c.krw);
  const exchangedKrw = sum(exchanges, (e) => e.krw);
  const refundKrw    = sum(refunds, (r) => r.krw);
  const totalKrwExp  = sum(krwExps, (e) => e.amt);
  const acctBal = totalKrwDep - chargedKrw - exchangedKrw - totalKrwExp - creditKrw + refundKrw;

  // ── 합계 (원화 환산) ──
  // 외화 회비는 저장값이 아니라 현재 평균환율로 환산한다 (정산 탭과 기준 일치).
  const totalDepKrw = (deposits || []).reduce((s, d) => {
    const code = codeOfDeposit(d, trip);
    return s + (code === 'KRW' ? (d.krwEquiv || d.amt || 0) : toKrw(d.amt || 0, code));
  }, 0);
  const totalFxKrw = sum(expenses, (e) => expenseKrw(e, toKrw));

  return {
    byCurrency,
    acctBal,
    creditKrw,
    pendingCnt,
    totalDepKrw,
    totalFxKrw,
    totalKrwExp,
    totalExpKrw: totalFxKrw + totalKrwExp,
    hasNegative: acctBal < 0 || byCurrency.some((c) => c.cardBal < 0 || c.cashBal < 0),
    multi: byCurrency.length > 1,
  };
}
