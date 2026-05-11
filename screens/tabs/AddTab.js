import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import Segment     from '../../components/Segment';
import BottomSheet from '../../components/BottomSheet';
import DateField   from '../../components/DateField';

export default function AddTab({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const sym = trip.country.sym;
  const payMethods = trip.payMethods || ['트레블월렛', '현금'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FxExpenseForm
        trip={trip}
        expenses={expenses}
        setExpenses={setExpenses}
        sym={sym}
        payMethods={payMethods}
      />
      <KrwExpenseForm
        trip={trip}
        krwExps={krwExps}
        setKrwExps={setKrwExps}
      />
    </ScrollView>
  );
}

function FxExpenseForm({ trip, expenses, setExpenses, sym, payMethods }) {
  const [name,  setName]  = useState('');
  const [amt,   setAmt]   = useState('');
  const [pay,   setPay]   = useState(payMethods[0]);
  const [date,  setDate]  = useState('');
  const [payer, setPayer] = useState('공통');
  const [note,  setNote]  = useState('');

  const payOptions = payMethods.map(m => ({ value: m, label: m }));
  const payerOptions = ['공통', ...trip.members].map(m => ({ value: m, label: m }));

  const handleAdd = () => {
    if (!name || !amt) return;
    setExpenses([...expenses, {
      id: Date.now(),
      name,
      amt: parseFloat(amt.replace(/,/g, '')),
      pay,
      date,
      payer,
      note,
    }]);
    setName(''); setAmt(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💱 외화 지출</Text>

      {/* 1줄: 항목명 (단독) */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>항목명</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 골프장 그린피"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      {/* 2줄: 금액 | 결제수단 (Segment) */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>금액({sym})</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={amt}
            onChangeText={setAmt}
          />
        </View>
        <View style={[styles.col, { flex: 1.3 }]}>
          <Segment
            label="결제수단"
            value={pay}
            options={payOptions}
            onChange={setPay}
          />
        </View>
      </View>

      {/* 3줄: 날짜 | 결제자(BottomSheet) */}
      <View style={styles.formRow}>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
        <View style={styles.col}>
          <BottomSheet
            label="결제자"
            value={payer}
            options={payerOptions}
            onChange={setPayer}
            title="결제자 선택"
          />
        </View>
      </View>

      {/* 4줄: 메모 */}
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

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ 외화지출</Text>
      </TouchableOpacity>
    </View>
  );
}

function KrwExpenseForm({ trip, krwExps, setKrwExps }) {
  const [name,  setName]  = useState('');
  const [amt,   setAmt]   = useState('');
  const [date,  setDate]  = useState('');
  const [payer, setPayer] = useState('공통');
  const [note,  setNote]  = useState('');

  const payerOptions = ['공통', ...trip.members].map(m => ({ value: m, label: m }));

  const handleAdd = () => {
    if (!name || !amt) return;
    setKrwExps([...krwExps, {
      id: Date.now(),
      name,
      amt: parseInt(amt.replace(/,/g, '')),
      date,
      payer,
      note,
    }]);
    setName(''); setAmt(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💴 원화 지출</Text>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>항목명</Text>
          <TextInput
            style={styles.input}
            placeholder="예: 공항 주차"
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>금액(원화)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={amt}
            onChangeText={setAmt}
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
        <View style={styles.col}>
          <BottomSheet
            label="결제자"
            value={payer}
            options={payerOptions}
            onChange={setPayer}
            title="결제자 선택"
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ 원화지출</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

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

  addBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
