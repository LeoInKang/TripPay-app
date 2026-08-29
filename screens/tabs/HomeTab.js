import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { makeToKrwMulti } from '../../settle';
import { computeBalances } from '../../balances';
import { currencyOf, codeOfRecord, codeOfDeposit } from '../../currency';

// 잔액 한 줄. 통화가 하나면 종전처럼 금액만, 여럿이면 통화 코드를 앞에 붙인다.
function CurLine({ c, value, multi }) {
  const neg = value < 0;
  if (!multi) {
    return (
      <Text style={[styles.balValue, styles.balPos, neg && styles.balNeg]}>
        {c.sym}{value.toLocaleString('ko-KR')}
      </Text>
    );
  }
  return (
    <View style={styles.curLine}>
      <Text style={styles.curCode}>{c.code}</Text>
      <Text style={[styles.balValue, styles.balPos, neg && styles.balNeg]}>{value.toLocaleString('ko-KR')}</Text>
    </View>
  );
}

export default function HomeTab({ trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  // 환산·잔액은 모두 단일 출처를 쓴다 (settle.js / balances.js).
  // 화면에서 다시 계산하면 두 탭 숫자가 어긋난다.
  const toKrw = makeToKrwMulti(trip, charges, exchanges);
  const bal = computeBalances({
    trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps, toKrw,
  });
  const { byCurrency, acctBal, totalDepKrw, totalFxKrw, totalKrwExp, totalExpKrw, hasNegative, multi } = bal;
  const primary = byCurrency[0] || { sym: '', cardBal: 0, cashBal: 0 };

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
          <Text style={styles.balLabel}>총 입금 (원화환산)</Text>
          <Text style={styles.sumValue}>{totalDepKrw.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.balSub}>{deposits.length}건</Text>
        </View>
        <View style={[styles.sumCard, { flex: 1 }]}>
          <Text style={styles.balLabel}>총 지출 (원화환산)</Text>
          {/* 원화를 주 숫자로 두고 외화 합계는 부제로 내린다 (정산 탭과 같은 기준).
              통화가 여럿이면 외화끼리 더할 수 없으므로 부제를 생략한다. */}
          <Text style={[styles.sumValue, styles.sumValueOut]}>{totalExpKrw.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.balSub}>
            {multi
              ? `통화 ${byCurrency.length}종`
              : `${primary.sym}${primary.fxAmt.toLocaleString('ko-KR')}${totalKrwExp > 0 ? ` +₩${totalKrwExp.toLocaleString('ko-KR')}` : ''}`}
          </Text>
        </View>
      </View>

      {/* 잔액 카드 3개. 카드·현금은 통화별로 한 줄씩 (통화가 하나면 종전과 같은 모양) */}
      <View style={styles.balRow}>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>계좌 잔액</Text>
          <Text style={[styles.balValue, styles.balPos, acctBal < 0 && styles.balNeg]}>{acctBal.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.balSub}>충전가능</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>트래블카드 잔액</Text>
          {byCurrency.map(c => (
            <CurLine key={'card-' + c.code} c={c} value={c.cardBal} multi={multi} />
          ))}
          <Text style={styles.balSub}>충전{charges.length}회</Text>
        </View>
        <View style={styles.balCard}>
          <Text style={styles.balLabel}>현금 잔액</Text>
          {byCurrency.map(c => (
            <CurLine key={'cash-' + c.code} c={c} value={c.cashBal} multi={multi} />
          ))}
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
                      {/* 내역·회비 탭과 같은 자리에 통화를 적는다. 원화는 파랑, 외화는 보라. */}
                      {_codeOf(item, trip) === 'KRW' ? (
                        <View style={[styles.badge, styles.badgeKrw]}>
                          <Text style={[styles.badgeText, styles.badgeKrwText]}>KRW</Text>
                        </View>
                      ) : (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{_codeOf(item, trip)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.rowSub}>{_itemSub(item, _symOf(item, trip))}</Text>
                  </View>
                  <View style={styles.rowAmtBox}>
                    <Text style={[styles.rowAmt, { color: _amtColor(item.type) }]}>
                      {_itemAmt(item, _symOf(item, trip), trip)}
                    </Text>
                    {_isFxDeposit(item, trip) && (
                      <Text style={styles.rowAmtKrw}>
                        ≈₩{toKrw(item.amt || 0, codeOfDeposit(item, trip)).toLocaleString('ko-KR')}
                      </Text>
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
// 한 건의 통화 기호. 회비는 KRW일 수 있고, 나머지는 cur가 없으면 주 통화다.
function _symOf(item, trip) {
  const code = item.type === 'deposit' ? codeOfDeposit(item, trip) : codeOfRecord(item, trip);
  if (code === 'KRW') return '₩';
  const cur = currencyOf(trip, code);
  return (cur && cur.sym) || '';
}
// 내역 한 줄의 통화 코드. 원화 지출은 언제나 KRW다.
function _codeOf(item, trip) {
  if (item.type === 'deposit') return codeOfDeposit(item, trip);
  if (item.type === 'krwexp') return 'KRW';
  return codeOfRecord(item, trip);
}
function _isFxDeposit(item, trip) {
  return item.type === 'deposit' && codeOfDeposit(item, trip) !== 'KRW';
}
function _itemSub(item, sym) {
  if(item.type==='charge')   return `₩${item.krw?.toLocaleString('ko-KR')} → ${sym}${item.local?.toLocaleString('ko-KR')} · 환율 ${item.rate}`;
  if(item.type==='exchange') return `₩${item.krw?.toLocaleString('ko-KR')} → ${sym}${item.local?.toLocaleString('ko-KR')} · 환율 ${item.rate}`;
  if(item.type==='deposit')  return item.cur && item.cur !== 'KRW' ? '외화 회비납부' : '원화 회비납부';
  if(item.type==='krwexp')   return item.note ? `계좌 직접 차감 · ${item.note}` : '계좌 직접 차감';
  return item.pay || '';
}
// 부호는 쓰지 않는다 — 방향은 색이 말한다 (들어옴 초록 / 나감 빨강 / 이동 검정)
function _itemAmt(item, sym, trip) {
  if(item.type==='deposit') {
    if(_isFxDeposit(item, trip)) return `${sym}${(item.amt||0).toLocaleString('ko-KR')}`;
    return `₩${(item.krwEquiv||item.amt||0).toLocaleString('ko-KR')}`;
  }
  if(item.type==='charge')   return `${sym}${item.local?.toLocaleString('ko-KR')}`;
  if(item.type==='exchange') return `${sym}${item.local?.toLocaleString('ko-KR')}`;
  if(item.type==='expense')  return `${sym}${item.amt?.toLocaleString('ko-KR')}`;
  if(item.type==='krwexp')   return `₩${item.amt?.toLocaleString('ko-KR')}`;
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
  // 잔액·총 지출 색은 정산 탭과 같다 (남은 돈 초록 / 모자라거나 나간 돈 빨강)
  balPos: { color: '#1D9E75' },
  balNeg: { color: '#E24B4A' },
  curLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginTop: 2 },
  curCode: { fontSize: 10, color: '#6b6b6b' },
  sumRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  sumCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)' },
  // 정산 탭의 같은 카드와 크기를 맞춘다
  sumValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  sumValueOut: { color: '#E24B4A' },
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
  badgeKrw: { backgroundColor: '#e6f1fb' },
  badgeKrwText: { color: '#0c447c' },
  rowAmtBox: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 13, fontWeight: '700' },
  rowAmtKrw: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
});
