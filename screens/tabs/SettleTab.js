import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function SettleTab({ trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  const sym = trip.country.sym;
  const r100 = trip.country.r100;
  const members = trip.members;

  // 평균 환율
  const allFx = [...charges, ...exchanges];
  const avgRate = allFx.length > 0 ? allFx.reduce((s,i) => s+i.rate, 0) / allFx.length : 0;
  const toKrw = v => avgRate > 0 ? Math.round(v * avgRate / (r100 ? 100 : 1)) : 0;

  // 총 입금 (krwEquiv)
  const totalDeposit = deposits.reduce((s, d) => s + (d.krwEquiv || d.amt || 0), 0);

  // 총 지출
  const totalFxAmt = expenses.reduce((s, e) => s + e.amt, 0);
  const totalFxKrw = toKrw(totalFxAmt);
  const totalKrwExp = krwExps.reduce((s, e) => s + e.amt, 0);
  const totalExp = totalFxKrw + totalKrwExp;

  // 잔액 / 인당 환급
  const balance = totalDeposit - totalExp;
  const refundPer = members.length > 0 ? Math.round(balance / members.length) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 공유 버튼 */}
      <TouchableOpacity style={styles.shareBtn}>
        <Text style={styles.shareBtnText}>🔗 참석자에게 공유하기</Text>
      </TouchableOpacity>

      {/* 여행 경비 요약 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>여행 경비 요약</Text>

        <View style={styles.sumRow}>
          <View style={styles.sumItem}>
            <Text style={styles.sumLabel}>총 입금</Text>
            <Text style={styles.sumValue}>₩{totalDeposit.toLocaleString('ko-KR')}</Text>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumLabel}>총 지출</Text>
            <Text style={[styles.sumValue, { color: '#E24B4A' }]}>
              ₩{totalExp.toLocaleString('ko-KR')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.sumRow}>
          <View style={styles.sumItem}>
            <Text style={styles.sumLabel}>잔액</Text>
            <Text style={[styles.sumValue, { color: '#1D9E75' }]}>
              ₩{balance.toLocaleString('ko-KR')}
            </Text>
          </View>
          <View style={styles.sumItem}>
            <Text style={styles.sumLabel}>인당 환급</Text>
            <Text style={[styles.sumValue, { color: '#1D9E75' }]}>
              ₩{refundPer.toLocaleString('ko-KR')}
            </Text>
          </View>
        </View>
      </View>

      {/* 참석자별 정산 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>참석자별 정산</Text>
        {members.map((m, i) => {
          const paid = deposits.filter(d => d.mem === m)
            .reduce((s, d) => s + (d.krwEquiv || d.amt || 0), 0);
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
                <Text style={styles.memberSub}>납부 ₩{paid.toLocaleString('ko-KR')}</Text>
              </View>
              <View style={styles.refundBadge}>
                <Text style={styles.refundText}>
                  {refundPer > 0
                    ? `💚 ₩${refundPer.toLocaleString('ko-KR')}`
                    : '✅ 정산완료'}
                </Text>
              </View>
            </View>
          );
        })}
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

  shareBtn: {
    backgroundColor: '#378ADD',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  sumRow: { flexDirection: 'row', gap: 12 },
  sumItem: { flex: 1 },
  sumLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  sumValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  divider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.1)', marginVertical: 12 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  memberSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  refundBadge: { backgroundColor: '#E1F5EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  refundText: { fontSize: 12, fontWeight: '600', color: '#085041' },

  rateCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center' },
  rateText: { fontSize: 12, color: '#6b6b6b' },
});
