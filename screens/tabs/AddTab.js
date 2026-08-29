import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import Segment     from '../../components/Segment';
import CurrencyPicker from '../../components/CurrencyPicker';
import DateField   from '../../components/DateField';
import SplitEditor, { splitErrorMessage } from '../../components/SplitEditor';
import { PAY_METHODS, PAY_CREDIT } from '../../constants';
import { fmtInt, fmtDec, toNum } from '../../format';
import { tripCurrencies, defaultCode } from '../../currency';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function AddTab({ trip, expenses, krwExps, setExpenses, setKrwExps, openImportAI, lastCur, setLastCur }) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {openImportAI && (
        <TouchableOpacity style={styles.aiBtn} onPress={openImportAI} activeOpacity={0.8}>
          <Text style={styles.aiBtnText}>🧾 AI로 영수증 입력</Text>
          <Text style={styles.aiBtnHint}>영수증 사진을 AI에 읽혀 이 여행에 바로 추가</Text>
        </TouchableOpacity>
      )}
      <ExpenseForm
        trip={trip}
        lastCur={lastCur}
        setLastCur={setLastCur}
        expenses={expenses}
        krwExps={krwExps}
        setExpenses={setExpenses}
        setKrwExps={setKrwExps}
      />
    </ScrollView>
  );
}

// 외화·원화를 한 폼에서 입력한다. 통화 선택에 따라 저장 위치만 갈린다
// (외화 → expenses, 원화 → krwExps). 데이터 구조·정산 규칙은 종전과 동일.
function ExpenseForm({ trip, expenses, krwExps, setExpenses, setKrwExps, lastCur, setLastCur }) {
  // 통화 선택지 = 여행의 외화들 + 원화. 통화가 하나면 종전처럼 '외화 / 원화' 두 개다.
  const curList = tripCurrencies(trip);
  // 처음 골라 둘 통화는 목록 맨 앞 (직전에 쓴 통화가 있으면 그것)
  const [cur,   setCur]   = useState(lastCur || defaultCode(trip));   // 통화코드 | 'KRW'
  const [name,  setName]  = useState('');
  const [amt,   setAmt]   = useState('');
  const [pay,   setPay]   = useState(PAY_METHODS[0]);
  const [krwActual, setKrwActual] = useState('');
  const [date,  setDate]  = useState('');
  const [note,  setNote]  = useState('');
  const [splitVal, setSplitVal] = useState(null);

  const isFx = cur !== 'KRW';
  const curObj = curList.find(c => c.code === cur) || curList[0] || {};
  const sym  = isFx ? (curObj.sym || '') : '₩';
  const amtNum = (isFx ? parseFloat : parseInt)((amt || '').replace(/,/g, '')) || 0;
  // 확정 원화는 외화를 신용카드로 결제했을 때만 의미가 있다 (원화 지출은 이미 원화)
  const showKrwActual = isFx && pay === PAY_CREDIT;

  // 통화를 바꾸면 금액 표기 규칙도 바뀐다. 원화는 정수뿐이라 소수점은 반올림해 정리한다.
  const handleCurChange = (c) => {
    setCur(c);
    if (setLastCur) setLastCur(c);
    const n = toNum(amt);
    if (n) setAmt(c !== 'KRW' ? fmtDec(String(n)) : fmtInt(String(Math.round(n))));
  };

  // 통화가 하나면 '외화 ¥ / 원화 ₩', 여럿이면 통화 코드로만 구분한다.
  // 코드에 심볼을 덧붙이면 CHF처럼 둘이 같은 통화가 'CHF CHF'로 겹친다.
  // 심볼은 바로 아래 금액 칸 라벨에 이미 있다.
  const multi = curList.length > 1;
  const curOptions = [
    ...curList.map(c => ({ value: c.code, label: multi ? c.code : `외화 ${c.sym}` })),
    { value: 'KRW', label: multi ? 'KRW' : '원화 ₩' },
  ];
  const payOptions = PAY_METHODS.map(m => ({ value: m, label: m }));

  const handleAdd = () => {
    if (!name) return notify('항목명을 입력해 주세요.');
    if (!amt)  return notify('금액을 입력해 주세요.');
    if (!date) return notify('날짜를 선택해 주세요.');
    const splitErr = splitErrorMessage(splitVal, amtNum, sym);
    if (splitErr) return notify(splitErr);

    if (isFx) {
      const actual = Math.round(toNum(krwActual));
      setExpenses([...expenses, {
        id: Date.now(),
        name,
        amt: amtNum,
        pay,
        date,
        note,
        cur,                                   // 기준 통화라도 생략하지 않는다 (아래 주석 참조)
        ...(showKrwActual && actual > 0 ? { krwActual: actual } : {}),
        ...(splitVal || {}),
      }]);
    } else {
      // 원화 지출의 결제수단은 분류용이다 — 차감처는 언제나 계좌라 잔액·정산에는 쓰이지 않는다.
      setKrwExps([...krwExps, {
        id: Date.now(),
        name,
        amt: amtNum,
        pay,
        date,
        note,
        ...(splitVal || {}),
      }]);
    }
    setName(''); setAmt(''); setNote(''); setKrwActual(''); setSplitVal(null);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💳 지출 입력</Text>

      {/* 1줄: 날짜 | 항목명 */}
      <View style={styles.formRow}>
        <View style={[styles.col, { flex: 0.48 }]}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>항목명</Text>
          <TextInput
            style={styles.input}
            placeholder="항목명"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* 2줄: 통화 */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <CurrencyPicker label="통화" value={cur} options={curOptions} onChange={handleCurChange} />
        </View>
      </View>

      {/* 3줄: 금액 | 결제수단 */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>금액({sym})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType={isFx ? 'decimal-pad' : 'numeric'}
            value={amt}
            onChangeText={v => setAmt(isFx ? fmtDec(v) : fmtInt(v))}
          />
        </View>
        <View style={[styles.col, { flex: 1.6 }]}>
          <Segment label="결제수단" value={pay} options={payOptions} onChange={setPay} />
        </View>
      </View>

      {/* 4줄: 확정 원화 (외화를 신용카드로 결제했을 때만) */}
      {showKrwActual && (
        <View style={styles.formRow}>
          <View style={styles.col}>
            <Text style={styles.label}>확정 원화 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="카드값 확정 후 입력"
              keyboardType="numeric"
              value={krwActual}
              onChangeText={v => setKrwActual(fmtInt(v))}
            />
            <Text style={styles.hint}>
              비워두면 평균환율로 추정해요. 카드값이 확정되면 내역에서 수정해 넣으세요.
            </Text>
          </View>
        </View>
      )}

      {/* 5줄: 메모 */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            style={styles.input}
            placeholder="선택"
            value={note}
            onChangeText={setNote}
          />
        </View>
      </View>

      <SplitEditor
        members={trip.members}
        value={splitVal}
        onChange={setSplitVal}
        sym={sym}
        amount={amtNum}
      />

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ {isFx ? '외화지출' : '원화지출'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  aiBtn: {
    backgroundColor: '#eef4fb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(55,138,221,0.4)',
  },
  aiBtnText: { fontSize: 14, fontWeight: '700', color: '#0c447c' },
  aiBtnHint: { fontSize: 11, color: '#6b6b6b', marginTop: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },

  formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  col: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  hint: { fontSize: 11, color: '#9b9b9b', lineHeight: 16, marginTop: 4 },

  addBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
