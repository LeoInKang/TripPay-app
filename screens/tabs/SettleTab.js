import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { shareTrip, revokeShare, SHARE_TTL_DAYS } from '../../share';
import { computeSettlement, makeToKrwMulti, getAvgRates } from '../../settle';
import { computeBalances } from '../../balances';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 잔액 한 줄 + 인당 값. 통화가 하나면 종전 모양 그대로, 여럿이면 통화 코드를 앞에 붙인다.
// 코드를 붙일 때는 심볼을 빼서 'CHF CHF0'처럼 겹치지 않게 한다 (현황 탭과 같은 모양).
// 글꼴을 키우면 코드와 금액이 서로 밀어내 잘린다 — 현황 탭 CurLine 주석 참조.
function BalLine({ c, value, n, multi }) {
  const color = value < 0 ? '#E24B4A' : '#1D9E75';
  const sym = multi ? '' : c.sym;
  return (
    <View style={multi ? styles.balLineMulti : null}>
      <View style={styles.balLineTop}>
        {multi && <Text style={styles.balCode} numberOfLines={1}>{c.code}</Text>}
        <Text
          style={[styles.subValue, styles.balAmt, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {sym}{value.toLocaleString('ko-KR')}
        </Text>
      </View>
      <Text style={[styles.subPer, multi && styles.subPerRight]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        인당 {sym}{Math.round(value / n).toLocaleString('ko-KR')}
      </Text>
    </View>
  );
}

export default function SettleTab({ trip, setTrip, deposits, charges, exchanges, atms, refunds, expenses, krwExps }) {
  const members = trip.members;
  const N = members.length || 1;

  // 환산·잔액은 단일 출처를 쓴다 (settle.js / balances.js). 화면에서 다시 계산하지 않는다.
  const toKrw = makeToKrwMulti(trip, charges, exchanges);
  const bal = computeBalances({
    trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps, toKrw,
  });
  const {
    byCurrency, acctBal, creditKrw, pendingCnt,
    totalDepKrw: totalDeposit, totalFxKrw, totalKrwExp, totalExpKrw,
    hasNegative, multi,
  } = bal;
  const primary = byCurrency[0] || { sym: '', cardBal: 0, cashBal: 0, fxAmt: 0 };

  // 인당 분배값은 잔액 카드의 참고 표시용이다. 개인별 정산은 computeSettlement가 한다.
  const perAcct = Math.round(acctBal / N);

  // 통화별 평균환율 안내.
  // 그 통화의 충전·환전이 0건이면 실제 환율을 알 길이 없어 국가 기본값(exRate)으로 계산한다.
  // 숫자만 보여주면 "내가 아는 환율과 다르다"가 되므로, 어디서 나온 값인지 줄마다 밝힌다.
  // 실거래가 여럿이면 진짜 산술평균이라 '평균'이라고 적고, 한 건이면 그 값 그대로다.
  const rates = getAvgRates(trip, charges, exchanges);
  const rateLines = byCurrency
    .filter(c => (rates[c.code] || 0) > 0)
    // 심볼이 아니라 통화 코드로 적는다 — Kč·zł·Ft 는 한눈에 어느 나라 돈인지 알기 어렵다.
    // '평균 환율'은 카드 제목이 말해 주므로 줄마다 되풀이하지 않는다.
    .map(c => {
      const n = (c.chargeCount || 0) + (c.exchangeCount || 0);
      return {
        code: c.code,
        text: `${c.cur && c.cur.r100 ? '100' : '1'}${c.code} = ${rates[c.code].toFixed(2)}원`,
        note: n === 0 ? '참고 환율' : n === 1 ? '충전·환전 1건' : `충전·환전 ${n}건 평균`,
        isDefault: n === 0,
      };
    });
  const hasDefaultRate = rateLines.some(r => r.isDefault);

  // 개인별 정산 (선결제·참여자·분담방식 반영)
  const { perMember } = computeSettlement({ members, deposits, expenses, krwExps, trip, toKrw });

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
        balance: {
          acctBal, rates,
          byCurrency: byCurrency.map(c => ({ code: c.code, sym: c.sym, cardBal: c.cardBal, cashBal: c.cashBal })),
        },
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
            잔액이 마이너스입니다. 지출·충전이 입금보다 많아요.{'\n'}
            회비 납부를 먼저 넣었는지, 자동충전 내역이 빠지지 않았는지 확인해 보세요.
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

      {/* 여행 경비 요약 — 카드로 감싸지 않는다.
          바깥 카드(padding 14) 안에 잔액 카드(padding 10)를 넣으면 폭이 두 번 깎여
          현황 탭보다 28px 좁아지고, 글꼴을 키우면 「트래블카드 잔액」이 두 줄로 접힌다. */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>여행 경비 요약</Text>

        {/* 1줄: 총 입금 / 총 지출 */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>총 입금 (원화환산)</Text>
            <Text style={styles.subValueLg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{totalDeposit.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>총 지출 (원화환산)</Text>
            <Text style={[styles.subValueLg, { color: '#E24B4A' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {totalExpKrw.toLocaleString('ko-KR')}원
            </Text>
          </View>
        </View>

        {/* 2줄: 계좌 · 트래블카드 · 현금 (현황 탭과 같은 배치) */}
        <View style={styles.row2}>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>계좌 잔액</Text>
            {/* 계좌는 원화뿐이라 '0원'으로 적는다 (현황 탭과 같은 모양) */}
            <Text
              style={[styles.subValue, { color: acctBal < 0 ? '#E24B4A' : '#1D9E75' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {acctBal.toLocaleString('ko-KR')}원
            </Text>
            <Text style={styles.subPer} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>인당 {perAcct.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>트래블카드 잔액</Text>
            {byCurrency.map(c => (
              <BalLine key={'card-' + c.code} c={c} value={c.cardBal} n={N} multi={multi} />
            ))}
          </View>
          <View style={styles.subCard}>
            <Text style={styles.subLabel}>현금 잔액</Text>
            {byCurrency.map(c => (
              <BalLine key={'cash-' + c.code} c={c} value={c.cashBal} n={N} multi={multi} />
            ))}
          </View>
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
                  낸 돈 {pm.paidIn.toLocaleString('ko-KR')}원 · 부담 {pm.owed.toLocaleString('ko-KR')}원
                </Text>
              </View>
              <View style={[styles.refundBadge, owe && styles.oweBadge, zero && styles.zeroBadge]}>
                <Text style={[styles.refundText, owe && styles.oweText, zero && styles.zeroText]}>
                  {zero
                    ? '정산 완료'
                    : owe
                      ? `🔴 ${Math.abs(pm.net).toLocaleString('ko-KR')}원 더 내기`
                      : `💚 ${pm.net.toLocaleString('ko-KR')}원 돌려받기`}
                </Text>
              </View>
            </View>
          );
        })}

        {/* 하단 요약 */}
        <View style={styles.bottomSummary}>
          <Text style={styles.bottomSummaryText}>
            총 입금 {totalDeposit.toLocaleString('ko-KR')}원 · 총 지출 {totalExpKrw.toLocaleString('ko-KR')}원 · 낸 돈−부담 기준 개인별 정산
          </Text>
        </View>
      </View>

      {/* 평균 환율 — 통화별로 한 줄씩 */}
      {rateLines.length > 0 && (
        <View style={styles.rateCard}>
          <Text style={styles.rateTitle}>평균 환율</Text>
          {rateLines.map(r => (
            <Text key={r.code} style={styles.rateText}>
              {r.text}
              <Text style={r.isDefault ? styles.rateDefault : styles.rateReal}> · {r.note}</Text>
            </Text>
          ))}
          {hasDefaultRate && (
            <Text style={styles.rateHint}>
              참고 환율은 앱에 미리 넣어 둔 값이라 실제 시세와 다를 수 있어요.{'\n'}
              그 통화로 충전이나 환전을 한 건 넣으면 그 환율로 바뀝니다.
            </Text>
          )}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  balLineMulti: { marginTop: 4 },
  // 코드는 왼쪽, 금액은 오른쪽 (현황 탭의 잔액 줄과 같은 정렬)
  balLineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 },
  balCode: { fontSize: 11, color: '#6b6b6b', flexShrink: 1 },
  balAmt: { flexShrink: 1, textAlign: 'right' },
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  warnBanner: { backgroundColor: '#fce4e4', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#f0b8b8' },
  warnText: { fontSize: 12, color: '#c0413f', fontWeight: '600' },
  noticeBanner: { backgroundColor: '#FAEEDA', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: '#e8d3a8' },
  noticeText: { fontSize: 12, color: '#633806' },

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
  shareHint: { fontSize: 11, color: '#9b9b9b', marginTop: -4, marginBottom: 12, paddingHorizontal: 2 },

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
  // 껍데기 없이 제목만 두고 카드를 바로 놓는다 (현황 탭과 같은 폭)
  summary: { marginBottom: 12 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  subLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  subValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  // 20은 카드 밖으로 튀어 보였다. 옆 잔액(14)보다 한 단계만 크게 둔다.
  subValueLg: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  subPer: { fontSize: 10, color: '#9b9b9b', marginTop: 2 },
  subPerRight: { textAlign: 'right' },   // 금액을 오른쪽에 붙였으니 인당 값도 그 아래로 맞춘다

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
  memberSub: { fontSize: 10, color: '#9b9b9b' },
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

  rateCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12 },
  rateTitle: { fontSize: 12, color: '#6b6b6b', fontWeight: '700', marginBottom: 4 },
  rateText: { fontSize: 12, color: '#6b6b6b' },
  rateDefault: { color: '#BA7517', fontWeight: '600' },
  rateReal: { color: '#9b9b9b' },
  rateHint: { fontSize: 11, color: '#9b9b9b', marginTop: 8 },
});
