import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Modal
} from 'react-native';

export default function ExpenseTab({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const [showForm, setShowForm] = useState(false);
  const [isFx, setIsFx] = useState(true);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('공통');
  const [pay, setPay] = useState(trip.payMethods?.[0] || '카드');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const sym = trip.country.sym;

  const handleAdd = () => {
    if (!name || !amount) return;
    if (isFx) {
      setExpenses([...expenses, {
        id: Date.now(), name, amt: parseFloat(amount.replace(/,/g, '')),
        payer, pay, date, note,
      }]);
    } else {
      setKrwExps([...krwExps, {
        id: Date.now(), name, amt: parseInt(amount.replace(/,/g, '')),
        payer, date, note,
      }]);
    }
    setName(''); setAmount(''); setDate(''); setNote('');
    setShowForm(false);
  };

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'fx' })),
    ...krwExps.map(e => ({ ...e, type: 'krw' })),
  ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>외화 지출</Text>
              <Text style={styles.summaryValue}>{expenses.length}건</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.summaryLabel}>원화 지출</Text>
              <Text style={styles.summaryValue}>{krwExps.length}건</Text>
            </View>
          </View>
        </View>

        {allItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>지출 내역이 없어요</Text>
          </View>
        ) : (
          allItems.map(item => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>
                  {item.date}{item.pay ? ' · ' + item.pay : ''}{item.payer !== '공통' ? ' · ' + item.payer : ''}{item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <Text style={styles.rowAmt}>
                {item.type === 'fx' ? `${sym}${item.amt.toLocaleString('ko-KR')}` : `${item.amt.toLocaleString('ko-KR')}원`}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+ 지출 등록</Text>
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>지출 등록</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          {/* 외화/원화 선택 */}
          <View style={styles.typeRow}>
            <TouchableOpacity style={[styles.typeBtn, isFx && styles.typeBtnActive]} onPress={() => setIsFx(true)}>
              <Text style={[styles.typeLabel, isFx && styles.typeLabelActive]}>💱 외화 지출</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, !isFx && styles.typeBtnActive]} onPress={() => setIsFx(false)}>
              <Text style={[styles.typeLabel, !isFx && styles.typeLabelActive]}>💵 원화 지출</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>지출 항목</Text>
          <TextInput style={styles.input} placeholder="스시로 회전초밥" value={name} onChangeText={setName} />

          <Text style={styles.label}>{isFx ? `금액 (${sym})` : '금액 (원)'}</Text>
          <TextInput style={styles.input} placeholder={isFx ? '11,650' : '163,507'} keyboardType="numeric" value={amount} onChangeText={setAmount} />

          {isFx && trip.payMethods?.length > 0 && (
            <>
              <Text style={styles.label}>결제 수단</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {trip.payMethods.map(m => (
                  <TouchableOpacity key={m} style={[styles.chip, pay === m && styles.chipActive]} onPress={() => setPay(m)}>
                    <Text style={[styles.chipText, pay === m && styles.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>결제자</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['공통', ...trip.members].map(m => (
              <TouchableOpacity key={m} style={[styles.chip, payer === m && styles.chipActive]} onPress={() => setPayer(m)}>
                <Text style={[styles.chipText, payer === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>날짜</Text>
          <TextInput style={styles.input} placeholder="09-22" value={date} onChangeText={setDate} />

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
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 20 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  rowAmt: { fontSize: 14, fontWeight: '700', color: '#1a3a5c' },
  fab: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: '#1a3a5c', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, padding: 20, backgroundColor: '#f5f5f0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a3a5c' },
  modalClose: { fontSize: 15, color: '#2563a8' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  typeBtnActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  typeLabel: { fontSize: 13, color: '#1a1a1a' },
  typeLabelActive: { color: '#fff', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', padding: 12, fontSize: 15 },
  chip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  chipActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  chipText: { fontSize: 13, color: '#1a1a1a' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  btnSave: { backgroundColor: '#1a3a5c', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
