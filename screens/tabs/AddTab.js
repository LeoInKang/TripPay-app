import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';

export default function AddTab({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const sym = trip.country.sym;
  const payMethods = trip.payMethods || ['트레블월렛', '현금'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 외화 지출 폼 */}
      <FxExpenseForm
        trip={trip}
        expenses={expenses}
        setExpenses={setExpenses}
        sym={sym}
        payMethods={payMethods}
      />
      {/* 원화 지출 폼 */}
      <KrwExpenseForm
        trip={trip}
        krwExps={krwExps}
        setKrwExps={setKrwExps}
      />
    </ScrollView>
  );
}

function FxExpenseForm({ trip, expenses, setExpenses, sym, payMethods }) {
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');
  const [pay, setPay] = useState(payMethods[0]);
  const [date, setDate] = useState('');
  const [payer, setPayer] = useState('공통');
  const [note, setNote] = useState('');

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
        <View style={styles.col}>
          <Text style={styles.label}>결제수단</Text>
          <View style={styles.chipRow}>
            {payMethods.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, pay === m && styles.chipActive]}
                onPress={() => setPay(m)}
              >
                <Text style={[styles.chipText, pay === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>날짜 · 결제자 · 메모</Text>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>날짜</Text>
          <TextInput style={styles.input} placeholder="" value={date} onChangeText={setDate} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>결제자</Text>
          <View style={styles.chipRow}>
            {['공통', ...trip.members].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, payer === m && styles.chipActive]}
                onPress={() => setPayer(m)}
              >
                <Text style={[styles.chipText, payer === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Text style={styles.addBtnText}>+ 외화지출</Text>
      </TouchableOpacity>
    </View>
  );
}

function KrwExpenseForm({ trip, krwExps, setKrwExps }) {
  const [name, setName] = useState('');
  const [amt, setAmt] = useState('');
  const [date, setDate] = useState('');
  const [payer, setPayer] = useState('공통');
  const [note, setNote] = useState('');

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

      <Text style={styles.sectionLabel}>결제자 · 메모</Text>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>날짜</Text>
          <TextInput style={styles.input} placeholder="" value={date} onChangeText={setDate} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>결제자</Text>
          <View style={styles.chipRow}>
            {['공통', ...trip.members].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, payer === m && styles.chipActive]}
                onPress={() => setPayer(m)}
              >
                <Text style={[styles.chipText, payer === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
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
    paddingVertical: 8,
    fontSize: 14,
  },

  sectionLabel: {
    fontSize: 11,
    color: '#9b9b9b',
    marginTop: 6,
    marginBottom: 4,
  },

  chipRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipActive: { backgroundColor: '#1a3a5c' },
  chipText: { fontSize: 11, color: '#6b6b6b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  addBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
