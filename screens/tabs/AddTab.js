import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import Segment     from '../../components/Segment';
import DateField   from '../../components/DateField';
import SplitEditor, { splitErrorMessage } from '../../components/SplitEditor';
import { PAY_METHODS, PAY_CREDIT } from '../../constants';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 정수 금액용 천단위 콤마 포맷 (숫자만 남기고 콤마 삽입)
function fmtInt(v) {
  const digits = (v || '').toString().replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ko-KR');
}

export default function AddTab({ trip, expenses, krwExps, setExpenses, setKrwExps, openImportAI }) {
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
function ExpenseForm({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const fxSym = trip.country.sym;

  const [cur,   setCur]   = useState('LOCAL');   // 'LOCAL'(외화) | 'KRW'(원화)
  const [name,  setName]  = useState('');
  const [amt,   setAmt]   = useState('');
  const [pay,   setPay]   = useState(PAY_METHODS[0]);
  const [krwActual, setKrwActual] = useState('');
  const [date,  setDate]  = useState('');
  const [note,  setNote]  = useState('');
  const [splitVal, setSplitVal] = useState(null);

  const isFx = cur === 'LOCAL';
  const sym  = isFx ? fxSym : '₩';
  const amtNum = (isFx ? parseFloat : parseInt)((amt || '').replace(/,/g, '')) || 0;
  // 확정 원화는 외화를 신용카드로 결제했을 때만 의미가 있다 (원화 지출은 이미 원화)
  const showKrwActual = isFx && pay === PAY_CREDIT;

  const curOptions = [
    { value: 'LOCAL', label: `외화 ${fxSym}` },
    { value: 'KRW',   label: '원화 ₩' },
  ];
  const payOptions = PAY_METHODS.map(m => ({ value: m, label: m }));

  const handleAdd = () => {
    if (!name) return notify('항목명을 입력해 주세요.');
    if (!amt)  return notify('금액을 입력해 주세요.');
    if (!date) return notify('날짜를 선택해 주세요.');
    const splitErr = splitErrorMessage(splitVal, amtNum, sym);
    if (splitErr) return notify(splitErr);

    if (isFx) {
      const actual = parseInt((krwActual || '').replace(/,/g, '')) || 0;
      setExpenses([...expenses, {
        id: Date.now(),
        name,
        amt: amtNum,
        pay,
        date,
        note,
        ...(showKrwActual && actual > 0 ? { krwActual: actual } : {}),
        ...(splitVal || {}),
      }]);
    } else {
      setKrwExps([...krwExps, {
        id: Date.now(),
        name,
        amt: amtNum,
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
          <Segment label="통화" value={cur} options={curOptions} onChange={setCur} />
        </View>
      </View>

      {/* 3줄: 금액 | 결제수단 */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>금액({sym})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={amt}
            onChangeText={v => setAmt(fmtInt(v))}
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
