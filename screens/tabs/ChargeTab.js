import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert
} from 'react-native';
import DateField from '../../components/DateField';

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

const SUB_TABS = [
  { id: 'charge',   icon: '💳', label: '카드충전' },
  { id: 'exchange', icon: '🔄', label: '현금환전' },
  { id: 'atm',      icon: '🏧', label: 'ATM인출' },
  { id: 'refund',   icon: '↩', label: '카드잔액이전' },
];

export default function ChargeTab({
  trip, charges, exchanges, atms, refunds,
  setCharges, setExchanges, setAtms, setRefunds
}) {
  const [subTab, setSubTab] = useState('charge');
  const [editTarget, setEditTarget] = useState(null); // { type, item }
  const sym = trip.country.sym;
  const r100 = trip.country.r100;

  const calcRate = (krw, local) => {
    const k = parseInt((krw || '').replace(/,/g, '')) || 0;
    const l = parseInt((local || '').replace(/,/g, '')) || 0;
    if (!k || !l) return '';
    return (r100 ? (k / l * 100) : (k / l)).toFixed(2);
  };

  const startEdit = (type, item) => {
    setEditTarget({ type, item });
    setSubTab(type);
  };
  const clearEdit = () => setEditTarget(null);
  const editItemFor = (type) => (editTarget && editTarget.type === type ? editTarget.item : null);

  const [confirmKey, setConfirmKey] = useState(null);
  const renderRowActions = (rowKey, onEdit, onDelete) => (
    confirmKey === rowKey ? (
      <View style={styles.delWrap}>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmYes]} onPress={() => { onDelete(); setConfirmKey(null); }}>
          <Text style={styles.confirmYesText}>삭제</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, styles.confirmNo]} onPress={() => setConfirmKey(null)}>
          <Text style={styles.confirmNoText}>취소</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.actWrap}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={6}>
          <Text style={styles.editText}>수정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmKey(rowKey)} hitSlop={6}>
          <Text style={styles.delText}>✕</Text>
        </TouchableOpacity>
      </View>
    )
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 서브 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabScroll}>
        {SUB_TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.subTab, subTab === t.id && styles.subTabActive]}
            onPress={() => setSubTab(t.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.subTabIcon}>{t.icon}</Text>
            <Text style={[styles.subTabText, subTab === t.id && styles.subTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {subTab === 'charge'   && <ChargeForm   {...{ trip, charges, setCharges, sym, r100, calcRate, editItem: editItemFor('charge'), onDone: clearEdit }} />}
      {subTab === 'exchange' && <ExchangeForm {...{ trip, exchanges, setExchanges, sym, r100, calcRate, editItem: editItemFor('exchange'), onDone: clearEdit }} />}
      {subTab === 'atm'      && <AtmForm      {...{ trip, atms, setAtms, sym, editItem: editItemFor('atm'), onDone: clearEdit }} />}
      {subTab === 'refund'   && <RefundForm   {...{ trip, refunds, setRefunds, sym, r100, editItem: editItemFor('refund'), onDone: clearEdit }} />}

      {/* 전체 내역 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>충전 / 환전 / ATM / 계좌이전 내역</Text>
        {charges.length + exchanges.length + atms.length + refunds.length === 0 ? (
          <Text style={styles.empty}>없습니다</Text>
        ) : (
          <>
            {charges.map(c => (
              <View key={'c-' + c.id} style={[styles.itemRow, editTarget && editTarget.type==='charge' && editTarget.item.id===c.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>💳</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>카드 충전</Text>
                  <Text style={styles.itemSub}>
                    {c.date} · ₩{c.krw.toLocaleString('ko-KR')} → {sym}{c.local.toLocaleString('ko-KR')} · 환율 {c.rate}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{c.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('c-' + c.id, () => startEdit('charge', c), () => { setCharges(charges.filter(x => x.id !== c.id)); if(editTarget&&editTarget.item.id===c.id) clearEdit(); })}
              </View>
            ))}
            {exchanges.map(e => (
              <View key={'e-' + e.id} style={[styles.itemRow, editTarget && editTarget.type==='exchange' && editTarget.item.id===e.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>🔄</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>현금 환전</Text>
                  <Text style={styles.itemSub}>
                    {e.date} · ₩{e.krw.toLocaleString('ko-KR')} → {sym}{e.local.toLocaleString('ko-KR')} · 환율 {e.rate}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{e.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('e-' + e.id, () => startEdit('exchange', e), () => { setExchanges(exchanges.filter(x => x.id !== e.id)); if(editTarget&&editTarget.item.id===e.id) clearEdit(); })}
              </View>
            ))}
            {atms.map(a => (
              <View key={'a-' + a.id} style={[styles.itemRow, editTarget && editTarget.type==='atm' && editTarget.item.id===a.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>🏧</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>ATM 인출</Text>
                  <Text style={styles.itemSub}>{a.date}{a.note ? ' · ' + a.note : ''}</Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{a.local.toLocaleString('ko-KR')}</Text>
                {renderRowActions('a-' + a.id, () => startEdit('atm', a), () => { setAtms(atms.filter(x => x.id !== a.id)); if(editTarget&&editTarget.item.id===a.id) clearEdit(); })}
              </View>
            ))}
            {refunds.map(r => (
              <View key={'r-' + r.id} style={[styles.itemRow, editTarget && editTarget.type==='refund' && editTarget.item.id===r.id && styles.itemRowEditing]}>
                <Text style={styles.itemIcon}>↩</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>카드 잔액 이전</Text>
                  <Text style={styles.itemSub}>
                    {r.date} · {sym}{r.local.toLocaleString('ko-KR')} → ₩{(r.krw||0).toLocaleString('ko-KR')}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>+₩{(r.krw||0).toLocaleString('ko-KR')}</Text>
                {renderRowActions('r-' + r.id, () => startEdit('refund', r), () => { setRefunds(refunds.filter(x => x.id !== r.id)); if(editTarget&&editTarget.item.id===r.id) clearEdit(); })}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ChargeForm({ trip, charges, setCharges, sym, r100, calcRate, editItem, onDone }) {
  const [krw, setKrw] = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      setKrw(editItem.krw != null ? fmtInt(String(editItem.krw)) : '');
      setLocal(editItem.local != null ? fmtInt(String(editItem.local)) : '');
      setRate(editItem.rate != null ? String(editItem.rate) : '');
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { setKrw(''); setLocal(''); setRate(''); setDate(''); setNote(''); };
  const handleKrw = (v) => { setKrw(fmtInt(v)); const r = calcRate(v, local); if (r) setRate(r); };
  const handleLocal = (v) => { setLocal(fmtInt(v)); const r = calcRate(krw, v); if (r) setRate(r); };

  const handleSubmit = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('충전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      krw: parseInt(krw.replace(/,/g, '')),
      local: parseInt(local.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    };
    if (editing) {
      setCharges(charges.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setCharges([...charges, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '카드 충전 수정' : '카드 충전 (계좌→카드)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>원화(계좌차감)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={handleKrw} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>외화</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={local} onChangeText={handleLocal} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율</Text>
          <TextInput style={styles.input} placeholder={trip.country.exRate ? '예: ' + trip.country.exRate : '환율'} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 충전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExchangeForm({ trip, exchanges, setExchanges, sym, r100, calcRate, editItem, onDone }) {
  const [krw, setKrw] = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      setKrw(editItem.krw != null ? fmtInt(String(editItem.krw)) : '');
      setLocal(editItem.local != null ? fmtInt(String(editItem.local)) : '');
      setRate(editItem.rate != null ? String(editItem.rate) : '');
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { setKrw(''); setLocal(''); setRate(''); setDate(''); setNote(''); };
  const handleKrw = (v) => { setKrw(fmtInt(v)); const r = calcRate(v, local); if (r) setRate(r); };
  const handleLocal = (v) => { setLocal(fmtInt(v)); const r = calcRate(krw, v); if (r) setRate(r); };

  const handleSubmit = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('환전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      krw: parseInt(krw.replace(/,/g, '')),
      local: parseInt(local.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    };
    if (editing) {
      setExchanges(exchanges.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setExchanges([...exchanges, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '현금 환전 수정' : '현금 환전 (계좌→현금)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>원화(계좌차감)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={handleKrw} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>외화</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={local} onChangeText={handleLocal} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율</Text>
          <TextInput style={styles.input} placeholder={trip.country.exRate ? '예: ' + trip.country.exRate : '환율'} keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 환전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function AtmForm({ trip, atms, setAtms, sym, editItem, onDone }) {
  const [local, setLocal] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      setLocal(editItem.local != null ? fmtInt(String(editItem.local)) : '');
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { setLocal(''); setDate(''); setNote(''); };

  const handleSubmit = () => {
    if (!local) return notify('인출 외화 금액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = { local: parseInt(local.replace(/,/g, '')), date, note };
    if (editing) {
      setAtms(atms.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setAtms([...atms, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? 'ATM 인출 수정' : '🏧 ATM 인출 (카드→현금)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <Text style={styles.helpText}>
        트레블월렛 카드로 현지 ATM에서 현금 인출 시 사용합니다.{'\n'}
        카드 잔액이 줄고 현금 잔액이 늘어납니다 (환율 변환 없음).
      </Text>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>인출 외화 금액</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={local} onChangeText={v => setLocal(fmtInt(v))} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="ATM 수수료는 별도 지출로 입력" value={note} onChangeText={setNote} />
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ ATM인출'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function RefundForm({ trip, refunds, setRefunds, sym, r100, editItem, onDone }) {
  const [local, setLocal] = useState('');
  const [krw, setKrw] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const editing = !!editItem;

  useEffect(() => {
    if (editItem) {
      setLocal(editItem.local != null ? fmtInt(String(editItem.local)) : '');
      setKrw(editItem.krw != null ? fmtInt(String(editItem.krw)) : '');
      setRate(editItem.rate != null ? String(editItem.rate) : '');
      setDate(editItem.date || '');
      setNote(editItem.note || '');
    }
  }, [editItem]);

  const reset = () => { setLocal(''); setKrw(''); setRate(''); setDate(''); setNote(''); };

  const handleLocal = (v) => {
    setLocal(fmtInt(v));
    const l = parseInt(v.replace(/,/g, '')) || 0;
    const k = parseInt(krw.replace(/,/g, '')) || 0;
    if (l && k) setRate((r100 ? k/l*100 : k/l).toFixed(2));
  };
  const handleKrw = (v) => {
    setKrw(fmtInt(v));
    const l = parseInt(local.replace(/,/g, '')) || 0;
    const k = parseInt(v.replace(/,/g, '')) || 0;
    if (l && k) setRate((r100 ? k/l*100 : k/l).toFixed(2));
  };
  const handleRate = (v) => {
    setRate(v);
    const l = parseInt(local.replace(/,/g, '')) || 0;
    const r = parseFloat(v) || 0;
    if (l && r) setKrw(Math.round(r100 ? l*r/100 : l*r).toLocaleString('ko-KR'));
  };

  const handleSubmit = () => {
    if (!local) return notify('카드 외화 잔액을 입력해 주세요.');
    if (!krw)   return notify('원화 환급액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    const payload = {
      local: parseInt(local.replace(/,/g, '')),
      krw: parseInt(krw.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    };
    if (editing) {
      setRefunds(refunds.map(x => x.id === editItem.id ? { ...x, ...payload } : x));
      onDone();
    } else {
      setRefunds([...refunds, { id: Date.now(), ...payload }]);
    }
    reset();
  };
  const handleCancel = () => { reset(); onDone(); };

  return (
    <View style={[styles.card, editing && styles.cardEditing]}>
      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{editing ? '카드→계좌 이전 수정' : '↩ 카드→계좌 이전 (잔액 환전)'}</Text>
        {editing && <TouchableOpacity onPress={handleCancel} hitSlop={8}><Text style={styles.cancelEdit}>취소</Text></TouchableOpacity>}
      </View>
      <Text style={styles.helpText}>
        트레블월렛 카드 잔액 일부 또는 전부를 원화로 환전해 계좌로 이전합니다.{'\n'}
        카드 잔액이 줄고, 환전 환율로 계산된 원화가 계좌에 반환됩니다.
      </Text>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>이전 외화 금액</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={local} onChangeText={handleLocal} />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>반환 원화(직접입력)</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={krw} onChangeText={handleKrw} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>환율(자동계산)</Text>
          <TextInput style={styles.input} placeholder="자동" keyboardType="decimal-pad" value={rate} onChangeText={handleRate} />
        </View>
        <View style={styles.col}>
          <DateField label="날짜" value={date} onChange={setDate} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>메모</Text>
          <TextInput style={styles.input} placeholder="선택" value={note} onChangeText={setNote} />
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>{editing ? '수정 저장' : '+ 카드 잔액 이전'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },
  content: { padding: 12, paddingBottom: 32 },

  subTabScroll: { marginBottom: 12, maxHeight: 50, flexGrow: 0 },
  subTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  subTabActive: { backgroundColor: '#1a3a5c', borderColor: '#1a3a5c' },
  subTabIcon: { fontSize: 14 },
  subTabText: { fontSize: 12, color: '#6b6b6b' },
  subTabTextActive: { color: '#fff', fontWeight: '600' },

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
  helpText: { fontSize: 11, color: '#9b9b9b', marginBottom: 12, lineHeight: 16 },

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

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  itemRowEditing: { backgroundColor: '#f0f6ff', borderRadius: 8 },
  itemIcon: { fontSize: 18, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  itemSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  itemAmt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  actWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  editBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#eef4fb' },
  editText: { fontSize: 12, color: '#0c447c', fontWeight: '700' },
  delBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  delText: { fontSize: 14, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
