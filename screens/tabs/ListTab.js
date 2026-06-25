import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';
import BottomSheet from '../../components/BottomSheet';

export default function ListTab({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const [filterDate, setFilterDate] = useState('all');
  const [filterPay, setFilterPay]   = useState('all');
  const sym = trip.country.sym;

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'fx' })),
    ...krwExps.map(e => ({ ...e, type: 'krw' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 필터 옵션 추출
  const uniqueDates = [...new Set(allItems.map(i => i.date).filter(Boolean))].sort();
  const uniquePays  = [...new Set(allItems.filter(i => i.pay).map(i => i.pay))];

  const dateOptions = [
    { value: 'all', label: '전체 날짜' },
    ...uniqueDates.map(d => ({ value: d, label: d })),
  ];
  const payOptions = [
    { value: 'all', label: '전체 결제수단' },
    ...uniquePays.map(p => ({ value: p, label: p })),
    { value: 'krw', label: '원화 지출' },
  ];

  const filtered = allItems.filter(item => {
    if (filterDate !== 'all' && item.date !== filterDate) return false;
    if (filterPay !== 'all') {
      if (filterPay === 'krw' && item.type !== 'krw') return false;
      if (filterPay !== 'krw' && item.pay !== filterPay) return false;
    }
    return true;
  });

  const handleDelete = (item) => {
    if (item.type === 'fx') {
      setExpenses(expenses.filter(e => e.id !== item.id));
    } else {
      setKrwExps(krwExps.filter(e => e.id !== item.id));
    }
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
    <View style={styles.container}>
      {/* 필터 바 */}
      <View style={styles.filterBar}>
        <View style={styles.filterCol}>
          <BottomSheet
            label="날짜"
            value={filterDate}
            options={dateOptions}
            onChange={setFilterDate}
            title="날짜 선택"
          />
        </View>
        <View style={styles.filterCol}>
          <BottomSheet
            label="결제수단"
            value={filterPay}
            options={payOptions}
            onChange={setFilterPay}
            title="결제수단 선택"
          />
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>지출 내역이 없어요</Text>
          </View>
        ) : (
          filtered.map(item => (
            <View key={item.id} style={styles.row}>
              <View style={styles.info}>
                <View style={styles.nameLine}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.type === 'krw' && (
                    <View style={styles.badgeKrw}>
                      <Text style={styles.badgeKrwText}>원화</Text>
                    </View>
                  )}
                  {item.payer && item.payer !== '공통' && (
                    <View style={styles.badgePayer}>
                      <Text style={styles.badgePayerText}>{item.payer}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sub}>
                  {item.date}{item.pay ? ' · ' + item.pay : ''}
                  {item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <Text style={styles.amt}>
                {item.type === 'fx'
                  ? `${sym}${item.amt.toLocaleString('ko-KR')}`
                  : `₩${item.amt.toLocaleString('ko-KR')}`}
              </Text>
              {renderDel('i-' + item.type + '-' + item.id, () => handleDelete(item))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },

  filterBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  filterCol: { flex: 1 },

  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 32 },

  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 13 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  info: { flex: 1 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  sub: { fontSize: 11, color: '#9b9b9b', marginTop: 2 },

  badgeKrw: {
    backgroundColor: '#e6f1fb',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeKrwText: { fontSize: 9, color: '#0c447c', fontWeight: '600' },
  badgePayer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgePayerText: { fontSize: 9, color: '#6b6b6b', fontWeight: '600' },

  amt: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  delBtn: { marginLeft: 8, padding: 4 },
  delText: { fontSize: 13, color: '#c0413f', fontWeight: '700' },
  delWrap: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
