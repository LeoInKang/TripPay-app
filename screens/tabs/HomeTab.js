import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getAvgRate, makeToKrw, expenseKrw } from '../../settle';
import { PAY_CASH, PAY_CREDIT } from '../../constants';

export default function HomeTab({ trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  const sym = trip.country.sym;
  const r100 = trip.country.r100;

  // 평균 환율 (settle.js 단일 출처)
  const avgRate = getAvgRate(trip, charges, exchanges);
  const toKrw = makeToKrw(avgRate, r100);

  // 카드(트래블카드) 잔액 = 충전 - 카드결제 - ATM인출 - 카드잔액이전 (SettleTab과 동일)
  // 신용카드는 카드 잔액이 아니라 계좌에서 빠지므로 제외한다.
  // 결제수단이 비어 있는 구버전 데이터는 종전대로 카드 결제로 본다.
  const cardCharged = charges.reduce((s,c) => s+c.local, 0);
  const cardSpent   = expenses.filter(e => e.pay !== PAY_CASH && e.pay !== PAY_CREDIT).reduce((s,e) => s+e.amt, 0);
  const cardRefund  = (refunds||[]).reduce((s,r) => s+(r.local||0), 0);
  const cardAtm     = (atms||[]).reduce((s,a) => s+(a.local||0), 0);
  const cardBal     = cardCharged - cardSpent - cardRefund - cardAtm;

  // 신용카드 외화 결제는 계좌에서 빠진다 (확정 원화가 있으면 그 금액, 없으면 평균환율 추정)
  const creditKrw = expenses.filter(e => e.pay === PAY_CREDIT).reduce((s,e) => s+expenseKrw(e, toKrw), 0);

  // 현금 잔액 = 환전합계 + ATM합계 + LOCAL 회비납부 - 현금결제합계
  const localDeposits = deposits.filter(d => d.cur === 'LOCAL').reduce((s,d) => s+(d.amt||0), 0);
  const cashIn    = exchanges.reduce((s,e) => s+e.local, 0) + (atms||[]).reduce((s,a) => s+a.local, 0) + localDeposits;
  const cashSpent = expenses.filter(e => e.pay === PAY_CASH).reduce((s,e) => s+e.amt, 0);
  const cashBal   = cashIn - cashSpent;

  // 계좌 잔액 = 원화입금만 - 충전krw - 환전krw - 원화지출 + 환급krw
  const totalKrwDeposit = deposits.filter(d => d.cur !== 'LOCAL').reduce((s,d) => s+(d.krwEquiv||d.amt||0), 0);
  // 총입금: 외화 회비는 저장값이 아니라 현재 평균환율로 환산 (정산 탭과 기준 일치)
  const totalDepKrw     = deposits.reduce((s,d) =>
    s + (d.cur === 'LOCAL' ? toKrw(d.amt||0) : (d.krwEquiv||d.amt||0)), 0);
  const totalCharged   = charges.reduce((s,c) => s+c.krw, 0);
  const totalExchanged = exchanges.reduce((s,e) => s+e.krw, 0);
  const totalKrwExp    = krwExps.reduce((s,e) => s+e.amt, 0);
  const refundKrw      = (refunds||[]).reduce((s,r) => s+(r.krw||0), 0);
  const acctBal        = totalKrwDeposit - totalCharged - totalExchanged - totalKrwExp - creditKrw + refundKrw;

  // 총 지출
  const totalFxAmt = expenses.reduce((s,e) => s+e.amt, 0);
  // 건별 환산 후 합 (참석자 부담 합계·정산 탭과 동일 기준)
  const totalFxKrw = expenses.reduce((s,e) => s+expenseKrw(e, toKrw), 0);

  // 잔액 음수 경고
  const hasNegative = acctBal < 0 || cardBal < 0 || cashBal < 0;

  // 전체 내역 타임라인
  const allItems = [
    ...deposits.map(d  => ({ ...d,  type:'deposit'  })),
    ...charges.map(c   => ({ ...c,  type:'charge'   })),
    ...exchanges.map(e => ({ ...e,  type:'exchange' })),
    ...expenses.map(e  => ({ ...e,  type:'expense'  })),
    ...krwExps.map(e   => ({ ...e,  type:'krwexp'   })),
  ].sort((a,b) => (b.date||'').localeCompare(a.date||''));

  const grouped = {};
  allItems.forEach(item => {
    const d = item.date || '날짜없음';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(item);
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {hasNegative && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>
            잔액이 마이너스입니다. 지출이 입금·충전보다 많아요.{'\n'}
            자동충전 내역이 빠지지 않았는지 확인해 보세요.
          </Text>
        </View>
      )}

      {/* 총 입금/지출 */}
      <View style={styles.sumRow}>
        <View style={[styles.sumCard, { flex: 1 }]}>
          <Text style={styles.balLabel}>총 입금</Text>
          <Text style={styles.sumValue}>₩{totalDepKrw.toLocaleString('ko-KR')}</Text>
          <Text style={styles.balSub}>{deposits.length}건</Text>
        </View>
        <View style={[styles.sumCard, { flex: 1 }]}>
          <Text style={styles.balLabel}>총 지출</Text>
          <Text style={styles.sumValue}>
            {sym}{totalFxAmt.toLocaleString('ko-KR')}{totalKrwExp>0?` +₩${totalKrwExp.toLocaleString('ko-KR')}`:''}
          </Text>
          <Text style={styles.balSub}>₩{(totalFxKrw+totalKrwExp).toLocaleString('ko-KR')} 상당</Text>
        </View>
      </View>

      {/* 잔액 카드 3개 */}
      <View style={styles.balRow}>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>계좌 잔액</Text>
          <Text style={[styles.balValue, acctBal < 0 && { color: '#E24B4A' }]}>{acctBal.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.balSub}>충전가능</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>카드 잔액</Text>
          <Text style={[styles.balValue, cardBal < 0 && { color: '#E24B4A' }]}>{sym}{cardBal.toLocaleString('ko-KR')}</Text>
          <Text style={styles.balSub}>충전{charges.length}회</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>현금 잔액</Text>
          <Text style={[styles.balValue, cashBal < 0 && { color: '#E24B4A' }]}>
            {sym}{cashBal.toLocaleString('ko-KR')}
          </Text>
          <Text style={styles.balSub}>환전{exchanges.length}·ATM{(atms||[]).length}</Text>
        </View>
      </View>

      {/* 전체 내역 */}
      <View style={styles.listCard}>
        <Text style={styles.listTitle}>전체 내역</Text>
        {Object.keys(grouped).length === 0 ? (
          <Text style={styles.empty}>내역이 없어요</Text>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <View key={date}>
              <Text style={styles.dateLabel}>{date}</Text>
              {items.map(item => (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: _dotBg(item.type) }]}>
                    <Text style={styles.dotText}>{_dotIcon(item.type)}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.rowNameLine}>
                      <Text style={styles.rowName}>{_itemName(item)}</Text>
                      {item.type==='deposit' && item.cur==='LOCAL' && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{trip.country.code}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSub}>{_itemSub(item, sym)}</Text>
                  </View>
                  <View style={styles.rowAmtBox}>
                    <Text style={[styles.rowAmt, { color: _amtColor(item.type) }]}>
                      {_itemAmt(item, sym)}
                    </Text>
                    {item.type==='deposit' && item.cur==='LOCAL' && (
                      <Text style={styles.rowAmtKrw}>≈₩{toKrw(item.amt||0).toLocaleString('ko-KR')}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function _dotBg(type) {
  return type==='deposit'?'#E1F5EE':type==='charge'?'#e8e8e8':type==='exchange'?'#fff3e0':'#fce4e4';
}
function _dotIcon(type) {
  return type==='deposit'?'💰':type==='charge'?'💳':type==='exchange'?'💵':type==='krwexp'?'₩':'🛒';
}
function _itemName(item) {
  if(item.type==='deposit')  return `${item.mem} 회비납부`;
  if(item.type==='charge')   return '트래블카드 충전';
  if(item.type==='exchange') return '현금 환전';
  return item.name || '';
}
function _itemSub(item, sym) {
  if(item.type==='charge')   return `₩${item.krw?.toLocaleString('ko-KR')} → ${sym}${item.local?.toLocaleString('ko-KR')} · 환율 ${item.rate}`;
  if(item.type==='exchange') return `₩${item.krw?.toLocaleString('ko-KR')} → ${sym}${item.local?.toLocaleString('ko-KR')} · 환율 ${item.rate}`;
  if(item.type==='deposit')  return item.cur==='LOCAL' ? '외화 회비납부' : '원화 회비납부';
  if(item.type==='krwexp')   return item.note ? `계좌 직접 차감 · ${item.note}` : '계좌 직접 차감';
  return item.pay || '';
}
function _itemAmt(item, sym) {
  if(item.type==='deposit') {
    if(item.cur === 'LOCAL') return `${sym}${(item.amt||0).toLocaleString('ko-KR')}`;
    return `+₩${(item.krwEquiv||item.amt||0).toLocaleString('ko-KR')}`;
  }
  if(item.type==='charge')   return `${sym}${item.local?.toLocaleString('ko-KR')}`;
  if(item.type==='exchange') return `${sym}${item.local?.toLocaleString('ko-KR')}`;
  if(item.type==='expense')  return `-${sym}${item.amt?.toLocaleString('ko-KR')}`;
  if(item.type==='krwexp')   return `-₩${item.amt?.toLocaleString('ko-KR')}`;
  return '';
}
function _amtColor(type) {
  if(type==='deposit') return '#1D9E75';
  if(type==='expense'||type==='krwexp') return '#E24B4A';
  return '#1a1a1a';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 32 },
  warnBanner: { backgroundColor: '#fce4e4', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 0.5, borderColor: '#f0b8b8' },
  warnText: { fontSize: 12, color: '#c0413f', fontWeight: '600', lineHeight: 16 },
  balRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  balCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' },
  balLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  balValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  balSub: { fontSize: 10, color: '#9b9b9b', marginTop: 2 },
  sumRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sumCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' },
  sumValue: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  listCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  listTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  empty: { color: '#9b9b9b', fontSize: 13, textAlign: 'center', padding: 20 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: '#9b9b9b', paddingTop: 12, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dotText: { fontSize: 14 },
  rowInfo: { flex: 1 },
  rowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  badge: { backgroundColor: '#e8e6ff', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#5044a8' },
  rowAmtBox: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 13, fontWeight: '700' },
  rowAmtKrw: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
});
