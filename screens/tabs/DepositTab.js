import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import CurrencyPicker from '../../components/CurrencyPicker';
import DateField   from '../../components/DateField';
import { fmtInt, fmtDec, toNum } from '../../format';
import { tripCurrencies, defaultCode, codeOfDeposit } from '../../currency';
import { getAvgRates } from '../../settle';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function DepositTab({ trip, deposits, setDeposits, charges = [], exchanges = [], lastCur, setLastCur }) {
  const [member,   setMember]   = useState(trip.members[0]);
  const [currency, setCurrency] = useState('KRW');
  const [amount,   setAmount]   = useState('');
  const [krwEquiv, setKrwEquiv] = useState('');
  const [date,     setDate]     = useState('');
  const [note,     setNote]     = useState('');
  const [editId,   setEditId]   = useState(null);
  // 목록이 길어지면 아래로 스크롤한 상태에서 '수정'을 눌러도 상단 폼이 안 보인다.
  // 수정 진입 시 폼 위치로 올려준다.
  const scrollRef = useRef(null);
  const scrollToForm = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  // 통화 선택지 = 원화 + 여행의 외화들. 통화가 하나면 종전처럼 '원화 / 외화' 두 개다.
  const curList = tripCurrencies(trip);
  const home = defaultCode(trip);   // 처음 골라 둘 통화
  const multiCur = curList.length > 1;
  const curObj = curList.find(c => c.code === currency) || curList[0] || {};
  const sym = curObj.sym || '';

  // 통화별 평균환율 (settle.js 단일 출처). 외화 회비는 그 통화의 환율로 자동 환산.
  const rates = getAvgRates(trip, charges, exchanges);
  const avgRate = rates[currency] || 0;
  const toKrwLocal = (v) => (avgRate > 0 ? Math.round((v * avgRate) / (curObj.r100 ? 100 : 1)) : 0);

  const memberOptions = trip.members.map(m => ({ value: m, label: m }));
  // 코드에 심볼을 덧붙이면 CHF처럼 둘이 같은 통화가 'CHF CHF'로 겹친다.
  // 심볼은 옆 금액 칸 라벨에 이미 있다.
  const currencyOptions = [
    { value: 'KRW', label: multiCur ? 'KRW' : '원화 ₩' },
    ...curList.map(c => ({ value: c.code, label: multiCur ? c.code : `외화 ${c.sym}` })),
  ];

  const handleAmtChange = (v) => {
    const isFx = currency !== 'KRW';
    setAmount(isFx ? fmtDec(v) : fmtInt(v));
    const n = toNum(v);
    setKrwEquiv(isFx && n ? toKrwLocal(n).toLocaleString('ko-KR') : '');
  };
  // 통화를 바꾸면 금액 표기 규칙도 바뀐다. 원화는 정수뿐이라 소수점은 반올림해 정리한다.
  const handleCurrencyChange = (c) => {
    setCurrency(c);
    if (setLastCur) setLastCur(c);
    const n = toNum(amount);
    if (n) setAmount(c !== 'KRW' ? fmtDec(String(n)) : fmtInt(String(Math.round(n))));
    setKrwEquiv(c !== 'KRW' && n ? toKrwLocal(n).toLocaleString('ko-KR') : '');
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
    if (currency !== 'KRW' && avgRate <= 0) {
      return notify('평균환율이 아직 없어요. 충전/환전을 먼저 입력하거나 원화로 납부해 주세요.');
    }
    if (!date) return notify('날짜를 선택해 주세요.');
    const a = currency !== 'KRW' ? toNum(amount) : Math.round(toNum(amount));
    const k = currency === 'KRW' ? a : toKrwLocal(a);
    const payload = {
      mem: member,
      cur: currency,
      amt: a,
      rate: currency !== 'KRW' ? Number(avgRate.toFixed(2)) : null,
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
    scrollToForm();
    setMember(d.mem);
    setCurrency(d.cur);
    setAmount(d.amt != null ? (d.cur && d.cur !== 'KRW' ? fmtDec(String(d.amt)) : fmtInt(String(d.amt))) : '');
    setKrwEquiv(d.cur && d.cur !== 'KRW' ? toKrwLocal(d.amt || 0).toLocaleString('ko-KR') : '');
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

  const krwDeps   = deposits.filter(d => codeOfDeposit(d, trip) === 'KRW');
  const localDeps = deposits.filter(d => codeOfDeposit(d, trip) !== 'KRW');
  // 외화 회비 한 건의 통화 정보
  const depCur  = (d) => curList.find(c => c.code === codeOfDeposit(d, trip)) || curList[0] || {};
  const depRate = (d) => rates[codeOfDeposit(d, trip)] || 0;
  const depKrw  = (d) => {
    const c = depCur(d), r = depRate(d);
    return r > 0 ? Math.round(((d.amt || 0) * r) / (c.r100 ? 100 : 1)) : 0;
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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

        {/* 1줄: 참석자(바텀시트) | 통화 | 회비(입력).
            통화가 여럿이면 세 칸으로는 좁아 글자가 접히므로 통화만 아래 줄로 내린다. */}
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
          {!multiCur && (
            <View style={[styles.col, { flex: 1.3 }]}>
              <CurrencyPicker label="통화" value={currency} options={currencyOptions} onChange={handleCurrencyChange} />
            </View>
          )}
          <View style={styles.col}>
            <Text style={styles.label}>{currency === 'KRW' ? '회비(원)' : `회비(${sym})`}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              keyboardType={currency !== 'KRW' ? 'decimal-pad' : 'numeric'}
              value={amount}
              onChangeText={handleAmtChange}
            />
          </View>
        </View>

        {multiCur && (
          <View style={styles.formRow}>
            <View style={styles.col}>
              <CurrencyPicker label="통화" value={currency} options={currencyOptions} onChange={handleCurrencyChange} />
            </View>
          </View>
        )}


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
                            {codeOfDeposit(d, trip)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.depSub}>
                        {d.date} · 환율 {depCur(d).r100 ? '100' : '1'}{depCur(d).sym}={depRate(d).toFixed(2)}원
                      </Text>
                    </View>
                    <View style={styles.depAmtBox}>
                      <Text style={styles.depAmt}>{depCur(d).sym}{d.amt.toLocaleString('ko-KR')}</Text>
                      <Text style={styles.depAmtKrw}>≈₩{depKrw(d).toLocaleString('ko-KR')}</Text>
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
