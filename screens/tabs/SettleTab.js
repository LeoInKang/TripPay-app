import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function SettleTab({ trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  const sym  = trip.country.sym;
  const r100 = trip.country.r100;
  const members = trip.members;
  const N = members.length || 1;

  // 평균 환율
  const allFx = [...charges, ...exchanges];
  const avgRate = allFx.length > 0 ? allFx.reduce((s,i) => s+i.rate, 0) / allFx.length : 0;
  const toKrw = v => avgRate > 0 ? Math.round(v * avgRate / (r100 ? 100 : 1)) : 0;

  // --- 총 입금 (원화환산) ---
  const totalDeposit = deposits.reduce((s, d) => s + (d.krwEquiv || d.amt || 0), 0);

  // --- 총 지출 (원화환산) ---
  const totalFxAmt    = expenses.reduce((s, e) => s + e.amt, 0);
  const totalFxKrw    = toKrw(totalFxAmt);
  const totalKrwExp   = krwExps.reduce((s, e) => s + e.amt, 0);
  const totalExpKrw   = totalFxKrw + totalKrwExp;

  // --- 카드(트레블월렛) 잔액 ---
  const cardCharged = charges.reduce((s,c) => s+c.local, 0);
  const cardRefund  = (refunds||[]).reduce((s,r) => s+r.local, 0);
  const cardAtm     = (atms||[]).reduce((s,a) => s+a.local, 0);
  const cardSpent   = expenses.filter(e => e.pay !== '현금').reduce((s,e) => s+e.amt, 0);
  const cardBal     = cardCharged - cardSpent - cardRefund - cardAtm;

  // --- 현금 잔액 ---
  const localDeps   = deposits.filter(d => d.cur === 'LOCAL').reduce((s,d) => s+(d.amt||0), 0);
  const cashIn      = exchanges.reduce((s,e) => s+e.local, 0) + cardAtm + localDeps;
  const cashSpent   = expenses.filter(e => e.pay === '현금').reduce((s,e) => s+e.amt, 0);
  const cashBal     = cashIn - cashSpent;

  // --- 계좌 잔액 (원화) ---
  const totalKrwDep   = deposits.filter(d => d.cur !== 'LOCAL').reduce((s,d) => s+(d.krwEquiv||d.amt||0), 0);
  const totalChargedKrw = charges.reduce((s,c) => s+c.krw, 0);
  const totalExchangedKrw = exchanges.reduce((s,e) => s+e.krw, 0);
  const refundKrw     = (refunds||[]).reduce((s,r) => s+(r.krw||0), 0);
  const acctBal       = totalKrwDep - totalChargedKrw - totalExchangedKrw - totalKrwExp + refundKrw;

  // --- 인당 환급 (전체 잔액의 원화환산을 인원수로 분배) ---
  const cardBalKrw = toKrw(cardBal);
  const cashBalKrw = toKrw(cashBal);
  const totalBalKrw = acctBal + cardBalKrw + cashBalKrw;
  const refundPer = Math.round(totalBalKrw / N);

  // --- 인당 분배값 (각 잔액별) ---
  const perAcct = Math.round(acctBal / N);
  const perCard = Math.round(cardBal / N);
  const perCash = Math.round(cashBal / N);
  const perCardKrw = Math.round(cardBalKrw / N);
  const perCashKrw = Math.round(cashBalKrw / N);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 공유 버튼 - 그라데이션 */}
      <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85}>
        <Text style={styles.shareBtnText}>🔗 참석자에게 공유하기</Text>
      </TouchableOpacity>

      {/* 여행 경비 요약 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>여행 경비 요약</Text>

        {/* 1줄: 총 입금 / 총 지출 */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>총 입금 (원화환산)</Text>
            <Text style={styles.subValueLg}>₩{totalDeposit.toLocaleString('ko-KR')}</Text>
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>총 지출 (원화환산)</Text>
            <Text style={[styles.subValueLg, { color: '#E24B4A' }]}>
              ₩{totalExpKrw.toLocaleString('ko-KR')}
            </Text>
          </View>
        </View>

        {/* 2줄: 계좌 잔액 / 트레블월렛 잔액 */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>계좌 잔액</Text>
            <Text style={[styles.subValue, { color: '#1D9E75' }]}>
              ₩{acctBal.toLocaleString('ko-KR')}
            </Text>
            <Text style={styles.subPer}>인당 ₩{perAcct.toLocaleString('ko-KR')}</Text>
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>트레블월렛 잔액</Text>
            <Text style={[styles.subValue, { color: '#1D9E75' }]}>
              {sym}{cardBal.toLocaleString('ko-KR')}
            </Text>
            <Text style={styles.subPer}>인당 {sym}{perCard.toLocaleString('ko-KR')}</Text>
          </View>
        </View>

        {/* 3줄: 현금 잔액 (단독) */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>현금 잔액</Text>
            <Text style={[styles.subValue, { color: cashBal < 0 ? '#E24B4A' : '#1D9E75' }]}>
              {sym}{cashBal.toLocaleString('ko-KR')}
            </Text>
            <Text style={styles.subPer}>인당 {sym}{perCash.toLocaleString('ko-KR')}</Text>
          </View>
          <View style={{ flex: 1 }} />
        </View>
      </View>

      {/* 참석자별 정산 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>참석자별 정산</Text>
        {members.map((m, i) => {
          const colors = ['#E6F1FB', '#E1F5EE', '#FAEEDA', '#EEEDFE'];
          const textColors = ['#0C447C', '#085041', '#633806', '#3C3489'];
          return (
            <View key={m} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: colors[i % colors.length] }]}>
                <Text style={[styles.avatarText, { color: textColors[i % textColors.length] }]}>
                  {m[0]}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m}</Text>
                <Text style={styles.memberSub}>
                  계좌 ₩{perAcct.toLocaleString('ko-KR')} + 트레블월렛 {sym}{perCard.toLocaleString('ko-KR')} + 현금 {sym}{perCash.toLocaleString('ko-KR')}
                </Text>
              </View>
              <View style={styles.refundBadge}>
                <Text style={styles.refundText}>
                  💚 ₩{refundPer.toLocaleString('ko-KR')} 돌려받기
                </Text>
              </View>
            </View>
          );
        })}

        {/* 하단 요약 */}
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomSummaryText}>
            총 입금 ₩{totalDeposit.toLocaleString('ko-KR')} · 총 지출 ₩{totalExpKrw.toLocaleString('ko-KR')} · 인당 환급 ₩{refundPer.toLocaleString('ko-KR')}
          </Text>
        </View>
      </View>

      {/* 평균 환율 */}
      {avgRate > 0 && (
        <View style={styles.rateCard}>
          <Text style={styles.rateText}>
            평균 환율: 1{sym} = {r100 ? (avgRate / 100).toFixed(2) : avgRate.toFixed(2)}원
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  // 공유 버튼 (그라데이션 효과를 위해 배경색 적용)
  shareBtn: {
    backgroundColor: '#378ADD',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  // 잔액 카드 2열 레이아웃
  row2: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  subCard: {
    flex: 1,
    backgroundColor: '#f8f7f3',
    borderRadius: 10,
    padding: 12,
  },
  subLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  subValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  subValueLg: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  subPer: { fontSize: 10, color: '#9b9b9b', marginTop: 2 },

  // 참석자별 정산
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1, marginRight: 8 },
  memberName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  memberSub: { fontSize: 10, color: '#9b9b9b', lineHeight: 14 },
  refundBadge: { backgroundColor: '#E1F5EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  refundText: { fontSize: 12, fontWeight: '700', color: '#085041' },

  // 하단 요약
  bottomSummary: {
    backgroundColor: '#f8f7f3',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  bottomSummaryText: {
    fontSize: 11,
    color: '#6b6b6b',
    textAlign: 'center',
    fontWeight: '500',
  },

  rateCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center' },
  rateText: { fontSize: 12, color: '#6b6b6b' },
});
