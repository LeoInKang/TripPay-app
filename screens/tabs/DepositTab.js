import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import Segment     from '../../components/Segment';
import DateField   from '../../components/DateField';
import { getAvgRate, makeToKrw } from '../../settle';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

// 정수 금액용 천단위 콤마 포맷
function fmtInt(v) {
  const digits = (v || '').toString().replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('ko-KR');
}

export default function DepositTab({ trip, deposits, setDeposits, charges = [], exchanges = [] }) {
  const [member,   setMember]   = useState(trip.members[0]);
  const [currency, setCurrency] = useState('KRW');
  const [amount,   setAmount]   = useState('');
  const [krwEquiv, setKrwEquiv] = useState('');
  const [date,     setDate]     = useState('');
  const [note,     setNote]     = useState('');
  const [editId,   setEditId]   = useState(null);

  const sym  = trip.country.sym;
  const r100 = trip.country.r100;

  // 여행 평균환율 (settle.js 단일 출처). 외화 회비는 이 환율로 자동 환산.
  const avgRate = getAvgRate(trip, charges, exchanges);
  const toKrwLocal = makeToKrw(avgRate, r100);

  const memberOptions = trip.members.map(m => ({ value: m, label: m }));
  const currencyOptions = [
    { value: 'KRW',   label: `원화 ₩` },
    { value: 'LOCAL', label: `외화 ${sym}` },
  ];

  const handleAmtChange = (v) => {
    setAmount(fmtInt(v));
    const n = parseInt(v.replace(/,/g, '')) || 0;
    setKrwEquiv(currency === 'LOCAL' && n ? toKrwLocal(n).toLocaleString('ko-KR') : '');
  };
  const handleCurrencyChange = (c) => {
    setCurrency(c);
    const n = parseInt((amount || '').replace(/,/g, '')) || 0;
    setKrwEquiv(c === 'LOCAL' && n ? toKrwLocal(n).toLocaleString('ko-KR') : '');
  };

  const resetForm = () => {
    setEditId(null);
    setMember(trip.members[0]);
    setCurrency('KRW');
    setAmount(''); setKrwEquiv(''); setDate(''); setNote('');
  };

  const handleSubmit = () => {
    if (!member) return notify('참석자를 선택해 주세요.');
    if (!amount) return notify('회비 금액을 입력해 주세요.');
    if (currency === 'LOCAL' && avgRate <= 0) {
      return notify('평균환율이 아직 없어요. 충전/환전을 먼저 입력하거나 원화로 납부해 주세요.');
    }
    if (!date) return notify('날짜를 선택해 주세요.');
    const a = parseInt(amount.replace(/,/g, '')) || 0;
    const k = currency === 'KRW' ? a : toKrwLocal(a);
    const payload = {
      mem: member,
      cur: currency,
      amt: a,
      rate: currency === 'LOCAL' ? Number(avgRate.toFixed(2)) : null,
      krwEquiv: k,
      date,
      note,
    };
    if (editId != null) {
      setDeposits(deposits.map(d => d.id === editId ? { ...d, ...payload } : d));
    } else {
      setDeposits([...deposits, { id: Date.now(), ...payload }]);
    }
    resetForm();
  };

  const handleEdit = (d) => {
    setEditId(d.id);
    setMember(d.mem);
    setCurrency(d.cur);
    setAmount(d.amt != null ? fmtInt(String(d.amt)) : '');
    setKrwEquiv(d.cur === 'LOCAL' ? toKrwLocal(d.amt || 0).toLocaleString('ko-KR') : '');
    setDate(d.date || '');
    setNote(d.note || '');
  };

  const handleDelete = (id) => {
    setDeposits(deposits.filter(d => d.id !== id));
    if (editId === id) resetForm();
  };

  const [confirmKey, setConfirmKey] = useState(null);
  const renderRowActions = (rowKey, d) => (
    confirmKey === rowKey ? (
      <View style={styles.delWrap}>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmYes]} onPress={() => { handleDelete(d.id); setConfirmKey(null); }}>
          <Text style={styles.confirmYesText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmNo]} onPress={() => setConfirmKey(null)}>
          <Text style={styles.confirmNoText}>취소</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.actWrap}>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(d)} hitSlop={6}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmKey(rowKey)} hitSlop={6}>
          <Text style={styles.delText}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  );

  const krwDeps   = deposits.filter(d => d.cur === 'KRW');
  const localDeps = deposits.filter(d => d.cur === 'LOCAL');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 입력 폼 */}
      <View style={[styles.card, editId != null && styles.cardEditing]}>
        <View style={styles.titleRow}>
          <Text style={styles.cardTitle}>{editId != null ? '회비 수정' : '회비 납부'}</Text>
          {editId != null && (
            <TouchableOpacity onPress={resetForm} hitSlop={8}>
              <Text style={styles.cancelEdit}>취소</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 1줄: 참석자(바텀시트) | 통화(세그먼트) | 회비(입력) */}
        <View style={styles.formRow}>
          <View style={styles.col}>
            <BottomSheet
              label="참석자"
              value={member}
              options={memberOptions}
              onChange={setMember}
              title="참석자 선택"
            />
          </View>
          <View style={[styles.col, { flex: 1.3 }]}>
            <Segment
              label="통화"
              value={currency}
              options={currencyOptions}
              onChange={handleCurrencyChange}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>{currency === 'KRW' ? '회비(원)' : `회비(${sym})`}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmtChange}
            />
          </View>
        </View>


        {/* 2줄: 날짜(캘린더) | 메모 */}
        <View style={styles.formRow}>
          <View style={styles.col}>
            <DateField label="날짜" value={date} onChange={setDate} />
          </View>
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

        <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>{editId != null ? '수정 저장' : '+ 회비납부'}</Text>
        </TouchableOpacity>
      </View>

      {/* 회비 납부내역 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>회비 납부내역</Text>

        {deposits.length === 0 ? (
          <Text style={styles.empty}>없습니다</Text>
        ) : (
          <>
            {krwDeps.length > 0 && (
              <View>
                <Text style={styles.groupLabel}>원화 회비</Text>
                {krwDeps.map(d => (
                  <View key={d.id} style={[styles.depRow, editId === d.id && styles.depRowEditing]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{d.mem[0]}</Text>
                    </View>
                    <View style={styles.depInfo}>
                      <View style={styles.depNameLine}>
                        <Text style={styles.depName}>{d.mem}</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>KRW</Text>
                        </View>
                      </View>
                      <Text style={styles.depSub}>
                        {d.date}{d.note ? ' · ' + d.note : ''}
                      </Text>
                    </View>
                    <Text style={styles.depAmt}>
                      ₩{(d.krwEquiv || d.amt || 0).toLocaleString('ko-KR')}
                    </Text>
                    {renderRowActions('d-' + d.id, d)}
                  </View>
                ))}
              </View>
            )}

            {localDeps.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.groupLabel}>외화 회비납부</Text>
                {localDeps.map(d => (
                  <View key={d.id} style={[styles.depRow, editId === d.id && styles.depRowEditing]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{d.mem[0]}</Text>
                    </View>
                    <View style={styles.depInfo}>
                      <View style={styles.depNameLine}>
                        <Text style={styles.depName}>{d.mem}</Text>
                        <View style={[styles.badge, styles.badgeJpy]}>
                          <Text style={[styles.badgeText, styles.badgeJpyText]}>
                            {trip.country.code}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.depSub}>
                        {d.date} · 환율 {r100 ? '100' : '1'}{sym}={avgRate.toFixed(2)}원
                      </Text>
                    </View>
                    <View style={styles.depAmtBox}>
                      <Text style={styles.depAmt}>{sym}{d.amt.toLocaleString('ko-KR')}</Text>
                      <Text style={styles.depAmtKrw}>≈₩{toKrwLocal(d.amt || 0).toLocaleString('ko-KR')}</Text>
                    </View>
                    {renderRowActions('d-' + d.id, d)}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
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
  cardEditing: { borderColor: '#378ADD', borderWidth: 1.2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  cancelEdit: { fontSize: 13, color: '#378ADD', fontWeight: '600', marginBottom: 12 },
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
  empty: { color: '#9b9b9b', fontSize: 13, textAlign: 'center', padding: 20 },
  groupLabel: { fontSize: 12, color: '#9b9b9b', marginBottom: 6, fontWeight: '500' },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  depRowEditing: { backgroundColor: '#f0f6ff', borderRadius: 8 },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 11, fontWeight: '600', color: '#6b6b6b' },
  depInfo: { flex: 1 },
  depNameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  depName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  depSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  badge: { backgroundColor: '#e6f1fb', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#0c447c' },
  badgeJpy: { backgroundColor: '#e8e6ff' },
  badgeJpyText: { color: '#5044a8' },
  depAmtBox: { alignItems: 'flex-end' },
  depAmt: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  depAmtKrw: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  actWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef4fb' },
  editText: { fontSize: 12, color: '#0c447c', fontWeight: '700' },
  delBtn: { padding: 4 },
  delText: { fontSize: 14, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
