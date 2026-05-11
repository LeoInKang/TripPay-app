import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Modal
} from 'react-native';

const MODE = [
  { id: 'charge',   label: '카드 충전', icon: '💳' },
  { id: 'exchange', label: '현금 환전', icon: '💵' },
];

export default function ChargeTab({ trip, charges, exchanges, setCharges, setExchanges }) {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('charge');
  const [krw, setKrw] = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const sym = trip.country.sym;
  const r100 = trip.country.r100;

  const calcRate = (k, l) => {
    if (!k || !l) return;
    const r = r100 ? parseInt(k) / parseInt(l) * 100 : parseInt(k) / parseInt(l);
    setRate(r.toFixed(2));
  };

  const handleKrw = (v) => { setKrw(v); calcRate(v, local); };
  const handleLocal = (v) => { setLocal(v); calcRate(krw, v); };
  const handleRate = (v) => {
    setRate(v);
    if (local && v) {
      const k = r100 ? parseInt(local) * parseFloat(v) / 100 : parseInt(local) * parseFloat(v);
      setKrw(Math.round(k).toString());
    }
  };

  const handleAdd = () => {
    if (!krw || !local) return;
    const item = {
      id: Date.now(),
      krw: parseInt(krw.replace(/,/g, '')),
      local: parseInt(local.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date: date || '',
      note,
    };
    if (mode === 'charge') setCharges([...charges, item]);
    else setExchanges([...exchanges, item]);
    setKrw(''); setLocal(''); setRate(''); setDate(''); setNote('');
    setShowForm(false);
  };

  const allItems = [
    ...charges.map(c => ({ ...c, type: 'charge' })),
    ...exchanges.map(e => ({ ...e, type: 'exchange' })),
  ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const totalKrw = allItems.reduce((s, i) => s + i.krw, 0);
  const totalLocal = allItems.reduce((s, i) => s + i.local, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 충전/환전</Text>
          <Text style={styles.summaryValue}>{sym}{totalLocal.toLocaleString('ko-KR')}</Text>
          <Text style={styles.summaryDetail}>{totalKrw.toLocaleString('ko-KR')}원 투입</Text>
        </View>

        {allItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>충전/환전 내역이 없어요</Text>
          </View>
        ) : (
          allItems.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.rowIcon}>{item.type === 'charge' ? '💳' : '💵'}</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.type === 'charge' ? '카드 충전' : '현금 환전'}</Text>
                <Text style={styles.rowSub}>{item.date}{item.note ? ' · ' + item.note : ''} · 환율 {item.rate}</Text>
              </View>
              <View style={styles.rowAmts}>
                <Text style={styles.rowAmt}>{sym}{item.local.toLocaleString('ko-KR')}</Text>
                <Text style={styles.rowAmtSub}>{item.krw.toLocaleString('ko-KR')}원</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+ 충전/환전 등록</Text>
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>충전/환전 등록</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          {/* 모드 선택 */}
          <View style={styles.modeRow}>
            {MODE.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.modeBtn, mode === m.id && styles.modeBtnActive]}
                onPress={() => setMode(m.id)}
              >
                <Text style={styles.modeIcon}>{m.icon}</Text>
                <Text style={[styles.modeLabel, mode === m.id && styles.modeLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>원화 (원)</Text>
          <TextInput style={styles.input} placeholder="710,920" keyboardType="numeric" value={krw} onChangeText={handleKrw} />

          <Text style={styles.label}>{trip.country.name}화 ({sym})</Text>
          <TextInput style={styles.input} placeholder="76,000" keyboardType="numeric" value={local} onChangeText={handleLocal} />

          <Text style={styles.label}>환율 (자동계산)</Text>
          <TextInput style={styles.input} placeholder="935.42" keyboardType="decimal-pad" value={rate} onChangeText={handleRate} />

          <Text style={styles.label}>날짜</Text>
          <TextInput style={styles.input} placeholder="09-20" value={date} onChangeText={setDate} />

          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput style={styles.input} placeholder="" value={note} onChangeText={setNote} />

          <TouchableOpacity style={styles.btnSave} onPress={handleAdd}>
            <Text style={styles.btnSaveText}>저장</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  summaryCard: { backgroundColor: '#1a3a5c', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  summaryDetail: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  rowIcon: { fontSize: 24, marginRight: 10 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  rowAmts: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 14, fontWeight: '700', color: '#1a3a5c' },
  rowAmtSub: { fontSize: 11, color: '#9b9b9b' },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1a3a5c', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, padding: 20, backgroundColor: '#f5f5f0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a3a5c' },
  modalClose: { fontSize: 15, color: '#2563a8' },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  modeBtnActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  modeIcon: { fontSize: 24, marginBottom: 4 },
  modeLabel: { fontSize: 13, color: '#1a1a1a' },
  modeLabelActive: { color: '#fff', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', padding: 12, fontSize: 15 },
  btnSave: { backgroundColor: '#1a3a5c', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
