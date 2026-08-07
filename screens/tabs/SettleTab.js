import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { shareTrip, revokeShare, SHARE_TTL_DAYS } from '../../share';
import { computeSettlement, getAvgRate, makeToKrw, expenseKrw } from '../../settle';
import { PAY_CASH, PAY_CREDIT } from '../../constants';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function SettleTab({ trip, setTrip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  const sym  = trip.country.sym;
  const r100 = trip.country.r100;
  const members = trip.members;
  const N = members.length || 1;

  // 평균 환율 (settle.js 단일 출처)
  const avgRate = getAvgRate(trip, charges, exchanges);
  const toKrw = makeToKrw(avgRate, r100);

  // --- 총 입금 (원화환산) ---
  const totalDeposit = deposits.reduce((s, d) =>
    s + (d.cur === 'LOCAL' ? toKrw(d.amt || 0) : (d.krwEquiv || d.amt || 0)), 0);

  // --- 총 지출 (원화환산) ---
  const totalFxAmt    = expenses.reduce((s, e) => s + e.amt, 0);
  // 건별 환산 합 (참석자 부담 합계와 동일 기준)
  const totalFxKrw    = expenses.reduce((s, e) => s + expenseKrw(e, toKrw), 0);
  const totalKrwExp   = krwExps.reduce((s, e) => s + e.amt, 0);
  const totalExpKrw   = totalFxKrw + totalKrwExp;

  // --- 카드(트래블카드) 잔액 ---
  // 신용카드는 카드 잔액이 아니라 계좌에서 빠지므로 제외한다.
  // 결제수단이 비어 있는 구버전 데이터는 종전대로 카드 결제로 본다.
  const cardCharged = charges.reduce((s,c) => s+c.local, 0);
  const cardRefund  = (refunds||[]).reduce((s,r) => s+r.local, 0);
  const cardAtm     = (atms||[]).reduce((s,a) => s+a.local, 0);
  const cardSpent   = expenses.filter(e => e.pay !== PAY_CASH && e.pay !== PAY_CREDIT).reduce((s,e) => s+e.amt, 0);
  const cardBal     = cardCharged - cardSpent - cardRefund - cardAtm;

  // --- 신용카드 (계좌 차감 · 확정 대기 안내용) ---
  const creditExps  = expenses.filter(e => e.pay === PAY_CREDIT);
  const creditKrw   = creditExps.reduce((s,e) => s+expenseKrw(e, toKrw), 0);
  const pendingCnt  = creditExps.filter(e => !(e.krwActual > 0)).length;

  // --- 현금 잔액 ---
  const localDeps   = deposits.filter(d => d.cur === 'LOCAL').reduce((s,d) => s+(d.amt||0), 0);
  const cashIn      = exchanges.reduce((s,e) => s+e.local, 0) + cardAtm + localDeps;
  const cashSpent   = expenses.filter(e => e.pay === PAY_CASH).reduce((s,e) => s+e.amt, 0);
  const cashBal     = cashIn - cashSpent;

  // --- 계좌 잔액 (원화) ---
  const totalKrwDep   = deposits.filter(d => d.cur !== 'LOCAL').reduce((s,d) => s+(d.krwEquiv||d.amt||0), 0);
  const totalChargedKrw = charges.reduce((s,c) => s+c.krw, 0);
  const totalExchangedKrw = exchanges.reduce((s,e) => s+e.krw, 0);
  const refundKrw     = (refunds||[]).reduce((s,r) => s+(r.krw||0), 0);
  const acctBal       = totalKrwDep - totalChargedKrw - totalExchangedKrw - totalKrwExp - creditKrw + refundKrw;

  const hasNegative = acctBal < 0 || cardBal < 0 || cashBal < 0;

  // --- 인당 분배값 (각 잔액별) ---
  // 개인별 정산은 아래 computeSettlement가 하고, 이 값들은 잔액 카드의 참고 표시용이다.
  const perAcct = Math.round(acctBal / N);
  const perCard = Math.round(cardBal / N);
  const perCash = Math.round(cashBal / N);

  // 개인별 정산 (선결제·참여자·분담방식 반영)
  const { perMember } = computeSettlement({ members, deposits, expenses, krwExps, avgRate, r100 });

  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const share = trip.share;

  const fmtDate = (ms) => {
    const d = new Date(ms);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { url, method, id, token, expiresAt } = await shareTrip({
        trip, deposits, expenses, krwExps,
        balance: { avgRate, acctBal, cardBal, cashBal },
      });
      // 만료 정리·공유 취소에 쓰려면 링크를 어디에 만들었는지 남겨야 한다
      if (setTrip) setTrip({ ...trip, share: { id, token, expiresAt } });
      if (method === 'copy') notify('공유 링크를 복사했어요.\n' + url);
      else if (method === 'none') notify('공유 링크:\n' + url);
    } catch (e) {
      notify('공유에 실패했어요. 네트워크 연결을 확인해 주세요.');
    } finally {
      setSharing(false);
    }
  };

  const doRevoke = async () => {
    setRevoking(true);
    try {
      const result = await revokeShare(share);
      if (result === 'FAILED') {
        notify('취소하지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.');
        return;
      }
      if (setTrip) setTrip({ ...trip, share: null });
      notify('공유를 취소했어요. 기존 링크로는 더 이상 볼 수 없어요.');
    } finally {
      setRevoking(false);
    }
  };

  const handleRevoke = () => {
    if (revoking || !share?.id) return;
    const msg = '공유를 취소하면 이미 보낸 링크로도 내역을 볼 수 없어요. 취소할까요?';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) doRevoke();
    } else {
      Alert.alert('공유 취소', msg, [
        { text: '그대로 두기', style: 'cancel' },
        { text: '공유 취소', style: 'destructive', onPress: doRevoke },
      ]);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* 공유 버튼 - 그라데이션 */}
      <TouchableOpacity style={styles.shareBtn} activeOpacity={0.85} onPress={handleShare} disabled={sharing}>
        <Text style={styles.shareBtnText}>
          {sharing ? '공유 링크 만드는 중…' : share ? '🔗 새 링크로 다시 공유하기' : '🔗 참석자에게 공유하기'}
        </Text>
      </TouchableOpacity>

      {share ? (
        <View style={styles.shareInfo}>
          <Text style={styles.shareInfoText}>
            공유 중 · {fmtDate(share.expiresAt)}까지 볼 수 있어요
          </Text>
          <TouchableOpacity onPress={handleRevoke} disabled={revoking} hitSlop={8}>
            <Text style={styles.revokeBtn}>{revoking ? '취소 중…' : '공유 취소'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.shareHint}>
          링크를 아는 사람은 누구나 볼 수 있어요. 공유 후 {SHARE_TTL_DAYS}일이 지나면 자동으로 정리돼요.
        </Text>
      )}

      {hasNegative && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>
            잔액이 마이너스입니다. 지출이 입금·충전보다 많아요.{'\n'}
            자동충전 내역이 빠지지 않았는지 확인해 보세요.
          </Text>
        </View>
      )}

      {pendingCnt > 0 && (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>
            신용카드 {pendingCnt}건은 추정 금액이에요. 카드값 확정 후(3~5영업일) 확정 원화를 입력하면 정확해집니다.
          </Text>
        </View>
      )}

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

        {/* 2줄: 계좌 잔액 / 트래블카드 잔액 */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>계좌 잔액</Text>
            <Text style={[styles.subValue, { color: acctBal < 0 ? '#E24B4A' : '#1D9E75' }]}>
              ₩{acctBal.toLocaleString('ko-KR')}
            </Text>
            <Text style={styles.subPer}>인당 ₩{perAcct.toLocaleString('ko-KR')}</Text>
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>트래블카드 잔액</Text>
            <Text style={[styles.subValue, { color: cardBal < 0 ? '#E24B4A' : '#1D9E75' }]}>
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
          <View style={[styles.subCard, { backgroundColor: 'transparent' }]} />
        </View>
      </View>

      {/* 참석자별 정산 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>참석자별 정산</Text>
        {perMember.map((pm, i) => {
          const colors = ['#E6F1FB', '#E1F5EE', '#FAEEDA', '#EEEDFE'];
          const textColors = ['#0C447C', '#085041', '#633806', '#3C3489'];
          const owe = pm.net < 0;
          const zero = pm.net === 0;
          return (
            <View key={pm.name} style={styles.memberRow}>
              <View style={[styles.avatar, { backgroundColor: colors[i % colors.length] }]}>
                <Text style={[styles.avatarText, { color: textColors[i % textColors.length] }]}>
                  {pm.name[0]}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{pm.name}</Text>
                <Text style={styles.memberSub}>
                  낸 돈 ₩{pm.paidIn.toLocaleString('ko-KR')} · 부담 ₩{pm.owed.toLocaleString('ko-KR')}
                </Text>
              </View>
              <View style={[styles.refundBadge, owe && styles.oweBadge, zero && styles.zeroBadge]}>
                <Text style={[styles.refundText, owe && styles.oweText, zero && styles.zeroText]}>
                  {zero
                    ? '정산 완료'
                    : owe
                      ? `🔴 ₩${Math.abs(pm.net).toLocaleString('ko-KR')} 더 내기`
                      : `💚 ₩${pm.net.toLocaleString('ko-KR')} 돌려받기`}
                </Text>
              </View>
            </View>
          );
        })}

        {/* 하단 요약 */}
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomSummaryText}>
            총 입금 ₩{totalDeposit.toLocaleString('ko-KR')} · 총 지출 ₩{totalExpKrw.toLocaleString('ko-KR')} · 낸 돈−부담 기준 개인별 정산
          </Text>
        </View>
      </View>

      {/* 평균 환율 */}
      {avgRate > 0 && (
        <View style={styles.rateCard}>
          <Text style={styles.rateText}>
            평균 환율: {r100 ? '100' : '1'}{sym} = {avgRate.toFixed(2)}원
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  warnBanner: { backgroundColor: '#fce4e4', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#f0b8b8' },
  warnText: { fontSize: 12, color: '#c0413f', fontWeight: '600', lineHeight: 17 },
  noticeBanner: { backgroundColor: '#FAEEDA', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#e8d3a8' },
  noticeText: { fontSize: 12, color: '#633806', lineHeight: 17 },

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
  shareInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12, paddingVertical: 10, marginTop: -4, marginBottom: 12,
  },
  shareInfoText: { fontSize: 12, color: '#6b6b6b', flex: 1 },
  revokeBtn: { fontSize: 12, color: '#c0413f', fontWeight: '700', marginLeft: 8 },
  shareHint: { fontSize: 11, color: '#9b9b9b', lineHeight: 16, marginTop: -4, marginBottom: 12, paddingHorizontal: 2 },

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
  oweBadge: { backgroundColor: '#FCEBEB' },
  oweText: { color: '#A32D2D' },
  zeroBadge: { backgroundColor: '#F1EFE8' },
  zeroText: { color: '#5F5E5A' },

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
