import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView
} from 'react-native';

export default function ListTab({ trip, expenses, krwExps, setExpenses, setKrwExps }) {
  const [filterDate, setFilterDate] = useState('all');
  const [filterPay, setFilterPay] = useState('all');
  const sym = trip.country.sym;

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'fx' })),
    ...krwExps.map(e => ({ ...e, type: 'krw' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // 필터 옵션 추출
  const dates = ['all', ...new Set(allItems.map(i => i.date).filter(Boolean))];
  const pays = ['all', ...new Set(allItems.filter(i => i.pay).map(i => i.pay))];

  const filtered = allItems.filter(item => {
    if (filterDate !== 'all' && item.date !== filterDate) return false;
    if (filterPay !== 'all' && item.pay !== filterPay) return false;
    return true;
  });

  const handleDelete = (item) => {
    if (item.type === 'fx') {
      setExpenses(expenses.filter(e => e.id !== item.id));
    } else {
      setKrwExps(krwExps.filter(e => e.id !== item.id));
    }
  };

  return (
    <View style={styles.container}>
      {/* 필터 */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Text style={styles.filterLabel}>날짜:</Text>
          {dates.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.filterChip, filterDate === d && styles.filterChipActive]}
              onPress={() => setFilterDate(d)}
            >
              <Text style={[styles.filterChipText, filterDate === d && styles.filterChipTextActive]}>
                {d === 'all' ? '전체' : d}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <Text style={styles.filterLabel}>결제:</Text>
          {pays.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.filterChip, filterPay === p && styles.filterChipActive]}
              onPress={() => setFilterPay(p)}
            >
              <Text style={[styles.filterChipText, filterPay === p && styles.filterChipTextActive]}>
                {p === 'all' ? '전체' : p}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                  {item.date}{item.pay ? ' · ' + item.pay : item.payer === '공통' ? '' : ''}
                  {item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <Text style={styles.amt}>
                {item.type === 'fx'
                  ? `${sym}${item.amt.toLocaleString('ko-KR')}`
                  : `₩${item.amt.toLocaleString('ko-KR')}`}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.delBtn}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  filterScroll: { paddingHorizontal: 12, marginBottom: 4 },
  filterLabel: { fontSize: 11, color: '#9b9b9b', marginRight: 6, alignSelf: 'center' },
  filterChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
  },
  filterChipActive: { backgroundColor: '#1a3a5c' },
  filterChipText: { fontSize: 11, color: '#6b6b6b' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

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
  delBtnText: { fontSize: 13, color: '#c0c0c0' },
});
