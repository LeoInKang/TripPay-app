import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';
import Segment     from '../../components/Segment';
import DateField   from '../../components/DateField';

export default function DepositTab({ trip, deposits, setDeposits }) {
  const [member,   setMember]   = useState(trip.members[0]);
  const [currency, setCurrency] = useState('KRW');
  const [amount,   setAmount]   = useState('');
  const [rate,     setRate]     = useState('');
  const [krwEquiv, setKrwEquiv] = useState('');
  const [date,     setDate]     = useState('');
  const [note,     setNote]     = useState('');

  const sym  = trip.country.sym;
  const r100 = trip.country.r100;

  const memberOptions = trip.members.map(m => ({ value: m, label: m }));
  const currencyOptions = [
    { value: 'KRW',   label: `원화 ₩` },
    { value: 'LOCAL', label: `외화 ${sym}` },
  ];

  const handleAmtChange = (v) => {
    setAmount(v);
    const n = parseInt(v.replace(/,/g, '')) || 0;
    if (currency === 'LOCAL' && rate && n) {
      const k = r100 ? n * parseFloat(rate) / 100 : n * parseFloat(rate);
      setKrwEquiv(Math.round(k).toLocaleString('ko-KR'));
    }
  };
  const handleRateChange = (v) => {
    setRate(v);
    const a = parseInt(amount.replace(/,/g, '')) || 0;
    if (a && v) {
      const k = r100 ? a * parseFloat(v) / 100 : a * parseFloat(v);
      setKrwEquiv(Math.round(k).toLocaleString('ko-KR'));
    }
  };

  const handleAdd = () => {
    if (!member || !amount) return;
    const a = parseInt(amount.replace(/,/g, '')) || 0;
    const k = currency === 'KRW' ? a : (parseInt((krwEquiv || '').replace(/,/g, '')) || 0);
    setDeposits([...deposits, {
      id: Date.now(),
      mem: member,
      cur: currency,
      amt: a,
      rate: currency === 'LOCAL' ? parseFloat(rate) : null,
      krwEquiv: k,
      date,
      note,
    }]);
    setAmount(''); setRate(''); setKrwEquiv(''); setNote('');
  };

  const handleDelete = (id) => {
    setDeposits(deposits.filter(d => d.id !== id));
  };

  const krwDeps   = deposits.filter(d => d.cur === 'KRW');
  const localDeps = deposits.filter(d => d.cur === 'LOCAL');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 입력 폼 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>회비 납부</Text>

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
              onChange={setCurrency}
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

        {/* 외화 시: 환율 + 원화환산 */}
        {currency === 'LOCAL' && (
          <View style={styles.formRow}>
            <View style={styles.col}>
              <Text style={styles.label}>환율</Text>
              <TextInput
                style={styles.input}
                placeholder="930.00"
                keyboardType="decimal-pad"
                value={rate}
                onChangeText={handleRateChange}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>원화환산(자동)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#f5f5f0' }]}
                placeholder="자동"
                value={krwEquiv}
                editable={false}
              />
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

        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+ 회비납부</Text>
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
                  <View key={d.id} style={styles.depRow}>
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
                    <TouchableOpacity onPress={() => handleDelete(d.id)} style={styles.delBtn}>
                      <Text style={styles.delBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {localDeps.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.groupLabel}>외화 회비납부</Text>
                {localDeps.map(d => (
                  <View key={d.id} style={styles.depRow}>
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
                        {d.date} · 환율 {d.rate}
                      </Text>
                    </View>
                    <View style={styles.depAmtBox}>
                      <Text style={styles.depAmt}>{sym}{d.amt.toLocaleString('ko-KR')}</Text>
                      <Text style={styles.depAmtKrw}>≈₩{(d.krwEquiv || 0).toLocaleString('ko-KR')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(d.id)} style={styles.delBtn}>
                      <Text style={styles.delBtnText}>✕</Text>
                    </TouchableOpacity>
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
  empty: { color: '#9b9b9b', fontSize: 13, textAlign: 'center', padding: 20 },
  groupLabel: { fontSize: 12, color: '#9b9b9b', marginBottom: 6, fontWeight: '500' },
  depRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
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
  delBtn: { marginLeft: 8, padding: 4 },
  delBtnText: { fontSize: 14, color: '#c0c0c0' },
});
