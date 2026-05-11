import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SettleTab({ trip, deposits, charges, exchanges, expenses, krwExps }) {
  const members = trip.members;
  const sym = trip.country.sym;
  const r100 = trip.country.r100;

  // 평균 환율 계산
  const allFx = [...charges, ...exchanges];
  const avgRate = allFx.length > 0
    ? allFx.reduce((s, i) => s + i.rate, 0) / allFx.length
    : 0;

  const toKrw = (local) => avgRate > 0
    ? Math.round(local * avgRate / (r100 ? 100 : 1)) : 0;

  // 총 입금
  const totalDeposit = deposits.reduce((s, d) => s + d.amount, 0);

  // 총 외화 지출 (원화환산)
  const totalFxKrw = expenses.reduce((s, e) => s + toKrw(e.amt), 0);
  const totalKrwExp = krwExps.reduce((s, e) => s + e.amt, 0);
  const totalExp = totalFxKrw + totalKrwExp;

  // 잔액
  const balance = totalDeposit - totalExp;
  const refundPer = members.length > 0 ? Math.round(balance / members.length) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 요약 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>여행 경비 요약</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>총 입금</Text>
            <Text style={styles.summaryValue}>{totalDeposit.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>총 지출</Text>
            <Text style={[styles.summaryValue, { color: '#E24B4A' }]}>{totalExp.toLocaleString('ko-KR')}원</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>잔액</Text>
            <Text style={[styles.summaryValue, { color: '#1D9E75' }]}>{balance.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>인당 환급</Text>
            <Text style={[styles.summaryValue, { color: '#1D9E75' }]}>{refundPer.toLocaleString('ko-KR')}원</Text>
          </View>
        </View>
      </View>

      {/* 참석자별 정산 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>참석자별 정산</Text>
        {members.map((m, i) => {
          const paid = deposits.filter(d => d.mem === m).reduce((s, d) => s + d.amount, 0);
          const colors = ['#E6F1FB','#E1F5EE','#FAEEDA','#EEEDFE'];
          const textColors = ['#0C447C','#085041','#633806','#3C3489'];
          return (
            <View key={m} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: colors[i % colors.length] }]}>
                <Text style={[styles.avatarText, { color: textColors[i % textColors.length] }]}>{m[0]}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{m}</Text>
                <Text style={styles.memberSub}>납부 {paid.toLocaleString('ko-KR')}원</Text>
              </View>
              <View style={styles.refundBadge}>
                <Text style={styles.refundText}>
                  {refundPer > 0 ? `💚 ${refundPer.toLocaleString('ko-KR')}원` : '✅ 정산완료'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 환율 정보 */}
      {avgRate > 0 && (
        <View style={styles.rateCard}>
          <Text style={styles.rateText}>
            평균 환율: 1{sym} = {r100 ? (avgRate/100).toFixed(2) : avgRate.toFixed(2)}원
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  summaryCard: { backgroundColor: '#1a3a5c', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 12 },
  summaryRow: { flexDirection: 'row' },
  summaryItem: { flex: 1 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a5c', marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.07)' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  memberSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  refundBadge: { backgroundColor: '#E1F5EE', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  refundText: { fontSize: 12, fontWeight: '600', color: '#085041' },
  rateCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
  rateText: { fontSize: 12, color: '#6b6b6b' },
});
