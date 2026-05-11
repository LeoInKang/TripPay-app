import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Modal
} from 'react-native';

export default function DepositTab({ trip, deposits, setDeposits }) {
  const [showForm, setShowForm] = useState(false);
  const [member, setMember] = useState(trip.members[0]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const totalDeposit = deposits.reduce((s, d) => s + (d.krwEquiv || d.amt || 0), 0);

  const handleAdd = () => {
    if (!amount) return;
    const newDep = {
      id: Date.now(),
      mem: member,
      amount: parseInt(amount.replace(/,/g, '')),
      date: date || new Date().toLocaleDateString('ko-KR', {month:'2-digit',day:'2-digit'}).replace('. ','-').replace('.','-').trim(),
      note,
      cur: 'KRW',
    };
    setDeposits([...deposits, newDep]);
    setAmount(''); setDate(''); setNote('');
    setShowForm(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* 요약 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 회비 납부액</Text>
          <Text style={styles.summaryValue}>{totalDeposit.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.summaryDetail}>{deposits.length}건 · {trip.members.length}명</Text>
        </View>

        {/* 내역 */}
        {deposits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>회비 납부 내역이 없어요</Text>
          </View>
        ) : (
          deposits.map(d => (
            <View key={d.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{d.mem[0]}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{d.mem}</Text>
                <Text style={styles.rowSub}>{d.date}{d.note ? ' · ' + d.note : ''}</Text>
              </View>
              <Text style={styles.rowAmt}>{(d.krwEquiv || d.amt || 0).toLocaleString('ko-KR')}원</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* 추가 버튼 */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+ 회비 납부 등록</Text>
      </TouchableOpacity>

      {/* 입력 모달 */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>회비 납부 등록</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.modalClose}>닫기</Text>
            </TouchableOpacity>
          </View>

          {/* 참석자 선택 */}
          <Text style={styles.label}>참석자</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
            {trip.members.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.memberChip, member === m && styles.memberChipActive]}
                onPress={() => setMember(m)}
              >
                <Text style={[styles.memberChipText, member === m && styles.memberChipTextActive]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>회비 (원)</Text>
          <TextInput
            style={styles.input}
            placeholder="1,400,000"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>날짜</Text>
          <TextInput
            style={styles.input}
            placeholder="09-19"
            value={date}
            onChangeText={setDate}
          />

          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="1차 입금"
            value={note}
            onChangeText={setNote}
          />

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
  summaryCard: {
    backgroundColor: '#1a3a5c',
    borderRadius: 12, padding: 16, marginBottom: 16,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  summaryDetail: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    padding: 12, marginBottom: 8,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e6f1fb', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#0c447c', fontWeight: '700', fontSize: 14 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  rowAmt: { fontSize: 14, fontWeight: '700', color: '#1D9E75' },
  fab: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: '#1a3a5c', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, padding: 20, backgroundColor: '#f5f5f0' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a3a5c' },
  modalClose: { fontSize: 15, color: '#2563a8' },
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)',
    padding: 12, fontSize: 15,
  },
  memberScroll: { marginBottom: 4 },
  memberChip: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  memberChipActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  memberChipText: { fontSize: 13, color: '#1a1a1a' },
  memberChipTextActive: { color: '#fff', fontWeight: '700' },
  btnSave: {
    backgroundColor: '#1a3a5c', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 24,
  },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
