import React, { useState } from 'react';
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
  const sym = trip.country.sym;
  const r100 = trip.country.r100;

  const calcRate = (krw, local) => {
    const k = parseInt((krw || '').replace(/,/g, '')) || 0;
    const l = parseInt((local || '').replace(/,/g, '')) || 0;
    if (!k || !l) return '';
    return (r100 ? (k / l * 100) : (k / l)).toFixed(2);
  };

  const [confirmKey, setConfirmKey] = useState(null);
  const renderDel = (rowKey, onDelete) => (
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
      <TouchableOpacity style={styles.delBtn} onPress={() => setConfirmKey(rowKey)} hitSlop={8}>
        <Text style={styles.delText}>✕</Text>
      </TouchableOpacity>
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

      {subTab === 'charge'   && <ChargeForm   {...{ trip, charges, setCharges, sym, r100, calcRate }} />}
      {subTab === 'exchange' && <ExchangeForm {...{ trip, exchanges, setExchanges, sym, r100, calcRate }} />}
      {subTab === 'atm'      && <AtmForm      {...{ trip, atms, setAtms, sym }} />}
      {subTab === 'refund'   && <RefundForm   {...{ trip, refunds, setRefunds, sym, r100 }} />}

      {/* 전체 내역 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>충전 / 환전 / ATM / 계좌이전 내역</Text>
        {charges.length + exchanges.length + atms.length + refunds.length === 0 ? (
          <Text style={styles.empty}>없습니다</Text>
        ) : (
          <>
            {charges.map(c => (
              <View key={'c-' + c.id} style={styles.itemRow}>
                <Text style={styles.itemIcon}>💳</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>카드 충전</Text>
                  <Text style={styles.itemSub}>
                    {c.date} · ₩{c.krw.toLocaleString('ko-KR')} → {sym}{c.local.toLocaleString('ko-KR')} · 환율 {c.rate}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{c.local.toLocaleString('ko-KR')}</Text>
                {renderDel('c-' + c.id, () => setCharges(charges.filter(x => x.id !== c.id)))}
              </View>
            ))}
            {exchanges.map(e => (
              <View key={'e-' + e.id} style={styles.itemRow}>
                <Text style={styles.itemIcon}>🔄</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>현금 환전</Text>
                  <Text style={styles.itemSub}>
                    {e.date} · ₩{e.krw.toLocaleString('ko-KR')} → {sym}{e.local.toLocaleString('ko-KR')} · 환율 {e.rate}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{e.local.toLocaleString('ko-KR')}</Text>
                {renderDel('e-' + e.id, () => setExchanges(exchanges.filter(x => x.id !== e.id)))}
              </View>
            ))}
            {atms.map(a => (
              <View key={'a-' + a.id} style={styles.itemRow}>
                <Text style={styles.itemIcon}>🏧</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>ATM 인출</Text>
                  <Text style={styles.itemSub}>{a.date}{a.note ? ' · ' + a.note : ''}</Text>
                </View>
                <Text style={styles.itemAmt}>{sym}{a.local.toLocaleString('ko-KR')}</Text>
                {renderDel('a-' + a.id, () => setAtms(atms.filter(x => x.id !== a.id)))}
              </View>
            ))}
            {refunds.map(r => (
              <View key={'r-' + r.id} style={styles.itemRow}>
                <Text style={styles.itemIcon}>↩</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>카드 잔액 이전</Text>
                  <Text style={styles.itemSub}>
                    {r.date} · {sym}{r.local.toLocaleString('ko-KR')} → ₩{(r.krw||0).toLocaleString('ko-KR')}
                  </Text>
                </View>
                <Text style={styles.itemAmt}>+₩{(r.krw||0).toLocaleString('ko-KR')}</Text>
                {renderDel('r-' + r.id, () => setRefunds(refunds.filter(x => x.id !== r.id)))}
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function ChargeForm({ trip, charges, setCharges, sym, r100, calcRate }) {
  const [krw, setKrw] = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const handleKrw = (v) => { setKrw(v); const r = calcRate(v, local); if (r) setRate(r); };
  const handleLocal = (v) => { setLocal(v); const r = calcRate(krw, v); if (r) setRate(r); };

  const handleAdd = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('충전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    setCharges([...charges, {
      id: Date.now(),
      krw: parseInt(krw.replace(/,/g, '')),
      local: parseInt(local.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    }]);
    setKrw(''); setLocal(''); setRate(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>카드 충전 (계좌→카드)</Text>
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
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ 충전</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExchangeForm({ trip, exchanges, setExchanges, sym, r100, calcRate }) {
  const [krw, setKrw] = useState('');
  const [local, setLocal] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const handleKrw = (v) => { setKrw(v); const r = calcRate(v, local); if (r) setRate(r); };
  const handleLocal = (v) => { setLocal(v); const r = calcRate(krw, v); if (r) setRate(r); };

  const handleAdd = () => {
    if (!krw)   return notify('원화(계좌차감) 금액을 입력해 주세요.');
    if (!local) return notify('환전 외화 금액을 입력해 주세요.');
    if (!rate)  return notify('환율을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    setExchanges([...exchanges, {
      id: Date.now(),
      krw: parseInt(krw.replace(/,/g, '')),
      local: parseInt(local.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    }]);
    setKrw(''); setLocal(''); setRate(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>현금 환전 (계좌→현금)</Text>
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
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ 환전</Text>
      </TouchableOpacity>
    </View>
  );
}

function AtmForm({ trip, atms, setAtms, sym }) {
  const [local, setLocal] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!local) return notify('인출 외화 금액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    setAtms([...atms, {
      id: Date.now(),
      local: parseInt(local.replace(/,/g, '')),
      date, note,
    }]);
    setLocal(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🏧 ATM 인출 (카드→현금)</Text>
      <Text style={styles.helpText}>
        트레블월렛 카드로 현지 ATM에서 현금 인출 시 사용합니다.{'\n'}
        카드 잔액이 줄고 현금 잔액이 늘어납니다 (환율 변환 없음).
      </Text>
      <View style={styles.formRow}>
        <View style={styles.col}>
          <Text style={styles.label}>인출 외화 금액</Text>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={local} onChangeText={setLocal} />
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
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ ATM인출</Text>
      </TouchableOpacity>
    </View>
  );
}

function RefundForm({ trip, refunds, setRefunds, sym, r100 }) {
  const [local, setLocal] = useState('');
  const [krw, setKrw] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  const handleLocal = (v) => {
    setLocal(v);
    const l = parseInt(v.replace(/,/g, '')) || 0;
    const k = parseInt(krw.replace(/,/g, '')) || 0;
    if (l && k) setRate((r100 ? k/l*100 : k/l).toFixed(2));
  };
  const handleKrw = (v) => {
    setKrw(v);
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

  const handleAdd = () => {
    if (!local) return notify('카드 외화 잔액을 입력해 주세요.');
    if (!krw)   return notify('원화 환급액을 입력해 주세요.');
    if (!date)  return notify('날짜를 선택해 주세요.');
    setRefunds([...refunds, {
      id: Date.now(),
      local: parseInt(local.replace(/,/g, '')),
      krw: parseInt(krw.replace(/,/g, '')),
      rate: parseFloat(rate) || 0,
      date, note,
    }]);
    setLocal(''); setKrw(''); setRate(''); setNote('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>↩ 카드→계좌 이전 (잔액 환전)</Text>
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
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={styles.addBtnText}>+ 카드 잔액 이전</Text>
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
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
  itemIcon: { fontSize: 18, marginRight: 10 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  itemSub: { fontSize: 11, color: '#9b9b9b', marginTop: 1 },
  itemAmt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  delBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
  delText: { fontSize: 14, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
