import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Platform, StatusBar, Alert
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RECEIPT_PROMPT, parseAiJson } from '../receiptPrompt';
import { tripCurrencies } from '../currency';
import { PAY_CARD } from '../constants';
import { migrateTripData } from '../migrate';
import { listTrips, loadTripData, saveTripData, setCurrentTripId } from '../storage';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 클립보드 붙여넣기만으로 AI가 읽은 영수증을 여행에 넣는 화면.
// 네트워크를 쓰지 않는다 — 데이터는 클립보드에서 바로 온다.
// targetTripId(지출 탭에서 진입)가 있으면 그 여행에 바로 추가 — 여행 선택을 묻지 않는다.
// 랜딩에서 진입하면 기존처럼 여행을 고르거나 새 여행으로 만든다.
export default function ImportAIScreen({ navigation, route }) {
  const targetTripId = route?.params?.targetTripId || null;
  const [bundle, setBundle]   = useState(null);   // parseAiJson 결과
  const [trips, setTrips]     = useState([]);
  const [target, setTarget]   = useState(null);   // 여행 id 또는 '__new__'
  const [manual, setManual]   = useState(false);
  const [manualText, setManualText] = useState('');
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    (async () => {
      try { setTrips(await listTrips()); } catch (e) {}
    })();
  }, []);

  const copyPrompt = async () => {
    try {
      await Clipboard.setStringAsync(RECEIPT_PROMPT);
      notify('프롬프트를 복사했어요.\nAI(클로드·챗GPT·제미나이)에 영수증 사진과 함께 붙여넣으세요.');
    } catch (e) {
      notify('복사에 실패했어요. 다시 시도해 주세요.');
    }
  };

  const acceptText = (text) => {
    // AI가 옛 결제수단 이름을 쓸 수 있으므로 저장 데이터와 같은 변환을 거친다
    const data = migrateTripData(parseAiJson(text));
    if (!data) {
      notify('붙여넣은 내용에서 TripPay 형식을 찾지 못했어요.\nAI가 준 결과(JSON 코드블록)를 복사했는지 확인해 주세요.');
      return;
    }
    // 같은 내용 재가져오기 차단용 — 내용 기반 지문 (AI JSON에는 batchId가 없다)
    if (!data.batchId) {
      let h = 5381;
      const s = JSON.stringify([data.trip?.name, data.expenses, data.krwExps]);
      for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
      data.batchId = 'b_' + h.toString(36);
    }
    setBundle(data);
    if (targetTripId) {
      setTarget(targetTripId); // 지출 탭에서 온 경우: 현재 여행 고정
      return;
    }
    // 기본 대상: 묶음의 통화를 모두 가진 가장 최근 여행, 없으면 새 여행
    const fb = data.trip?.country?.code || '';
    const codes = [...new Set((data.expenses || []).map(e => (e && e.cur) || fb).filter(Boolean))];
    const match = trips.find(t => {
      const tc = tripCurrencies(t).map(c => c.code);
      return codes.every(c => tc.includes(c));
    });
    setTarget(match ? match.id : '__new__');
  };

  const pasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) { setManual(true); return; }
      acceptText(text);
    } catch (e) {
      setManual(true); // 클립보드를 못 읽는 환경(웹 등)은 직접 붙여넣기로
    }
  };

  const fxCount  = bundle ? (bundle.expenses || []).length : 0;
  // 영수증만으로는 트래블카드인지 신용카드인지 알 수 없어 AI는 카드 결제를 모두
  // 트래블카드로 넣는다(프롬프트 3번). 잘못 들어오면 차감처가 달라지므로 미리 알린다.
  const cardCount = bundle ? (bundle.expenses || []).filter(e => e && e.pay === PAY_CARD).length : 0;
  const krwCount = bundle ? (bundle.krwExps  || []).length : 0;
  const fxSum    = bundle ? (bundle.expenses || []).reduce((s, e) => s + (e.amt || 0), 0) : 0;
  const krwSum   = bundle ? (bundle.krwExps  || []).reduce((s, e) => s + (e.amt || 0), 0) : 0;
  const fmt      = (n) => n.toLocaleString('ko-KR');

  // 묶음에 든 외화 통화들. 지출마다 cur 를 적어 오면 여러 통화가 한 묶음에 담긴다.
  // 안 적어 온 옛 형식은 trip.country 를 그 통화로 본다.
  const bundleCurs = bundle ? tripCurrencies(bundle.trip) : [];
  const fallbackCode = bundle?.trip?.country?.code || '';
  const usedCodes = bundle
    ? [...new Set((bundle.expenses || []).map(e => (e && e.cur) || fallbackCode).filter(Boolean))]
    : [];
  const symOf = (c) => ((bundleCurs.find(x => x.code === c) || bundle?.trip?.country || {}).sym || c);
  // 한 통화뿐이면 예전처럼 그 통화의 심볼로 합계를 보여 준다
  const sym = usedCodes.length === 1 ? symOf(usedCodes[0]) : '';
  const code = usedCodes.length === 1 ? usedCodes[0] : '';
  // 통화가 섞이면 합계를 하나로 낼 수 없다. 통화별로 끊어 보여 준다.
  const fxByCur = usedCodes.map(c => ({
    code: c,
    sym: symOf(c),
    sum: (bundle?.expenses || [])
      .filter(e => ((e && e.cur) || fallbackCode) === c)
      .reduce((s, e) => s + (e.amt || 0), 0),
  }));

  const doImport = async () => {
    if (!bundle || !target || busy) return;
    setBusy(true);
    try {
      const now = Date.now();
      const stamp = (list, offset) => (list || []).map((e, i) => ({ ...e, id: now + offset + i }));
      // 지출에 통화를 적어 둔다. 이미 적혀 있으면 그대로 두고, 없으면 묶음의 여행 통화를 쓴다.
      // 생략하면 통화가 안 적힌 옛 기록과 구별되지 않는다.
      const stampFx = (list) => list.map(e => (e.cur ? e : (fallbackCode ? { ...e, cur: fallbackCode } : e)));
      const newFx  = stamp(bundle.expenses, 0);
      const newKrw = stamp(bundle.krwExps, 100000);
      const newIds = [...newFx, ...newKrw].map(e => e.id);

      if (target === '__new__') {
        const trip = { ...bundle.trip };
        if (!trip.id || trips.some(t => t.id === trip.id)) trip.id = 'trip_' + now;
        trip.importedBatches = [bundle.batchId];
        // 묶음에 여러 통화가 들어 있으면 그 나라를 모두 담아 다통화 여행으로 만든다.
        // 안 그러면 나중에 설정에서 나라를 하나씩 더해야 나머지 지출을 넣을 수 있다.
        if (!Array.isArray(trip.countries) || !trip.countries.length) {
          trip.countries = bundleCurs.length ? bundleCurs : (trip.country ? [trip.country] : []);
        }
        if (!trip.homeCode && trip.countries.length) trip.homeCode = trip.countries[0].code;
        const data = {
          trip,
          deposits: [], charges: [], exchanges: [], atms: [], refunds: [],
          expenses: stampFx(newFx),
          krwExps:  newKrw,
        };
        await saveTripData(trip.id, data);
        await setCurrentTripId(trip.id);
        openTrip(data, newIds);
        return;
      }

      const data = await loadTripData(target);
      if (!data || !data.trip) { notify('여행을 불러오지 못했어요.'); return; }

      // 묶음에 든 통화가 모두 그 여행에 있어야 받는다. 하나라도 없으면 어느 것이 없는지 알린다.
      const targetCodes = tripCurrencies(data.trip).map(c => c.code);
      const missing = usedCodes.filter(c => !targetCodes.includes(c));
      if (fxCount > 0 && missing.length) {
        const have = targetCodes.join(', ') || '?';
        notify(`이 여행에 없는 통화가 있어요: ${missing.join(', ')}\n여행의 통화는 ${have}예요.\n설정 → 여행 국가에서 그 나라를 추가하거나, 다른 여행을 골라 주세요.`);
        return;
      }
      const stampedFx = stampFx(newFx);
      const batches = data.trip.importedBatches || [];
      if (batches.includes(bundle.batchId)) {
        notify('이미 추가된 묶음이에요. 같은 결과를 두 번 넣지 않도록 막았어요.');
        return;
      }

      data.trip = { ...data.trip, importedBatches: [...batches, bundle.batchId] };
      data.expenses = [...(data.expenses || []), ...stampedFx];
      data.krwExps  = [...(data.krwExps  || []), ...newKrw];
      await saveTripData(data.trip.id, data);
      await setCurrentTripId(data.trip.id);
      openTrip(data, newIds);
    } finally {
      setBusy(false);
    }
  };

  // 가져온 뒤 내역 탭으로 바로 이동, 방금 추가된 지출은 하이라이트 표시
  const openTrip = (data, highlightIds) => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: {
        trip: data.trip,
        initialDeposits:  data.deposits  || [],
        initialCharges:   data.charges   || [],
        initialExchanges: data.exchanges || [],
        initialAtms:      data.atms      || [],
        initialRefunds:   data.refunds   || [],
        initialExpenses:  data.expenses  || [],
        initialKrwExps:   data.krwExps   || [],
        initialTab: 'list',
        highlightIds: highlightIds || [],
      } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI로 영수증 입력</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.step}>1. 프롬프트를 복사해 AI에 영수증 사진과 함께 붙여넣기</Text>
          <TouchableOpacity style={styles.btn} onPress={copyPrompt} activeOpacity={0.8}>
            <Text style={styles.btnText}>📋 프롬프트 복사</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>클로드·챗GPT·제미나이 어디든 돼요. 사진은 AI 앱에서 첨부하세요.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>2. AI가 준 결과(JSON)를 복사한 뒤, 여기서 붙여넣기</Text>
          <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={pasteClipboard} activeOpacity={0.8}>
            <Text style={styles.btnText}>📥 클립보드에서 가져오기</Text>
          </TouchableOpacity>
          {!manual && (
            <TouchableOpacity onPress={() => setManual(true)} hitSlop={6}>
              <Text style={styles.manualLink}>붙여넣기가 안 되면 직접 입력</Text>
            </TouchableOpacity>
          )}
          {manual && (
            <>
              <TextInput
                style={styles.manualInput}
                multiline
                placeholder='AI가 준 결과를 여기에 붙여넣으세요'
                value={manualText}
                onChangeText={setManualText}
              />
              <TouchableOpacity style={[styles.btn, styles.btnBlue]} onPress={() => acceptText(manualText)} activeOpacity={0.8}>
                <Text style={styles.btnText}>확인</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {bundle && (
          <View style={[styles.card, styles.previewCard]}>
            <Text style={styles.step}>3. 확인하고 추가</Text>
            <Text style={styles.previewTitle}>
              {bundle.trip?.country?.flag} {bundle.trip?.name || '이름 없는 여행'}
            </Text>
            <Text style={styles.previewSum}>
              {fxCount > 0
                ? `외화 지출 ${fxCount}건 · ` + fxByCur.map(c => `${c.sym}${fmt(c.sum)}`).join(' · ')
                : ''}
              {fxCount > 0 && krwCount > 0 ? '  ·  ' : ''}
              {krwCount > 0 ? `원화 지출 ${krwCount}건 · ₩${fmt(krwSum)}` : ''}
            </Text>

            {cardCount > 0 && (
              <Text style={styles.payNote}>
                카드 결제 {cardCount}건은 트래블카드로 넣었어요.{'\n'}
                신용카드로 낸 건은 추가한 뒤 내역에서 바꿔 주세요.
              </Text>
            )}

            {targetTripId ? (() => {
              const t = trips.find(x => x.id === targetTripId);
              const mismatch = t && fxCount > 0
                && !usedCodes.every(c => tripCurrencies(t).map(x => x.code).includes(c));
              return (
                <View style={[styles.pickRow, styles.pickRowSel]}>
                  <Text style={[styles.pickText, styles.pickTextSel]}>
                    {t?.country?.flag || '🌏'} {t?.name || '현재 여행'}에 추가돼요
                    {mismatch ? <Text style={styles.pickWarn}>  통화 다름</Text> : null}
                  </Text>
                </View>
              );
            })() : (
            <>
            <Text style={styles.pickLabel}>어느 여행에 넣을까요?</Text>
            {trips.map(t => {
              // 묶음의 통화가 모두 그 여행에 있어야 맞는 것이다.
              // 목록 메타에 countries 가 없는 옛 여행은 country 하나로 본다.
              const tCodes = tripCurrencies(t).map(c => c.code);
              const codeMatch = usedCodes.every(c => tCodes.includes(c));
              const sel = target === t.id;
              return (
                <TouchableOpacity key={t.id} style={[styles.pickRow, sel && styles.pickRowSel]} onPress={() => setTarget(t.id)}>
                  <Text style={[styles.pickText, sel && styles.pickTextSel]}>
                    {t.country?.flag || '🌏'} {t.name} <Text style={styles.pickCode}>{t.country?.code}</Text>
                    {!codeMatch && fxCount > 0 ? <Text style={styles.pickWarn}>  통화 다름</Text> : null}
                  </Text>
                  {sel && <Text style={styles.pickCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.pickRow, target === '__new__' && styles.pickRowSel]}
              onPress={() => setTarget('__new__')}
            >
              <Text style={[styles.pickText, target === '__new__' && styles.pickTextSel]}>
                ➕ 새 여행으로 만들기: {bundle.trip?.name}
              </Text>
              {target === '__new__' && <Text style={styles.pickCheck}>✓</Text>}
            </TouchableOpacity>
            </>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnDark, busy && { opacity: 0.6 }]}
              onPress={doImport}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>{busy ? '추가하는 중…' : `지출 ${fxCount + krwCount}건 추가하기`}</Text>
            </TouchableOpacity>
            {/* 결제수단 안내는 위 주황 칸이 건수까지 알려 준다 — 여기서 되풀이하지 않는다 */}
            <Text style={styles.hint}>분담은 전원 균등으로 들어가요.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: '#f0eee8', borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sideBtn: { minWidth: 56 },
  backText: { fontSize: 14, color: '#1a3a5c', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  scroll: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.08)',
  },
  previewCard: { borderColor: '#378ADD', borderWidth: 1 },
  step: { fontSize: 13, fontWeight: '700', color: '#1a3a5c', marginBottom: 10 },

  btn: { backgroundColor: '#1a3a5c', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnBlue: { backgroundColor: '#378ADD' },
  btnDark: { backgroundColor: '#1a1a1a', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 11, color: '#9b9b9b', marginTop: 8 },
  manualLink: { fontSize: 12, color: '#378ADD', fontWeight: '600', textAlign: 'center', marginTop: 10 },
  manualInput: {
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.2)', borderRadius: 8,
    minHeight: 110, padding: 10, fontSize: 12, marginTop: 10, marginBottom: 10,
    textAlignVertical: 'top',
  },

  previewTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  previewSum: { fontSize: 13, color: '#3a3a3a', marginTop: 4, marginBottom: 8 },
  payNote: { fontSize: 11, color: '#8a5a06', backgroundColor: '#FAEEDA', borderRadius: 8, padding: 8, marginBottom: 12 },
  pickLabel: { fontSize: 12, fontWeight: '600', color: '#6b6b6b', marginBottom: 6 },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6, backgroundColor: '#fff',
  },
  pickRowSel: { borderColor: '#378ADD', borderWidth: 1.2, backgroundColor: '#f0f6ff' },
  pickText: { fontSize: 14, color: '#1a1a1a', flex: 1 },
  pickTextSel: { fontWeight: '700' },
  pickCode: { fontSize: 11, color: '#9b9b9b' },
  pickWarn: { fontSize: 11, color: '#BA7517', fontWeight: '700' },
  pickCheck: { fontSize: 14, color: '#378ADD', fontWeight: '700', marginLeft: 8 },
});
