import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function ListTab({ trip, expenses, krwExps }) {
  const [filter, setFilter] = useState('all');
  const sym = trip.country.sym;

  const allItems = [
    ...expenses.map(e  => ({ ...e, type:'fx'  })),
    ...krwExps.map(e   => ({ ...e, type:'krw' })),
  ].sort((a,b) => (b.date||'').localeCompare(a.date||''));

  const filtered = filter === 'all' ? allItems
    : filter === 'fx'  ? allItems.filter(i => i.type === 'fx')
    : allItems.filter(i => i.type === 'krw');

  return (
    <View style={styles.container}>
      {/* 필터 */}
      <View style={styles.filterRow}>
        {[['all','전체 날짜'],['fx','외화'],['krw','원화']].map(([id,label]) => (
          <TouchableOpacity
            key={id}
            style={[styles.filterBtn, filter===id && styles.filterBtnActive]}
            onPress={() => setFilter(id)}
          >
            <Text style={[styles.filterText, filter===id && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>지출 내역이 없어요</Text>
          </View>
        ) : (
          filtered.map(item => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  {item.type === 'krw' && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>원화</Text>
                    </View>
                  )}
                  {item.payer && item.payer !== '공통' && (
                    <View style={[styles.badge, { backgroundColor: '#f0f0f0' }]}>
                      <Text style={styles.badgeText}>{item.payer}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rowSub}>
                  {item.date}{item.pay ? ' · ' + item.pay : ''}{item.note ? ' · ' + item.note : ''}
                </Text>
              </View>
              <View style={styles.rowAmts}>
                <Text style={styles.rowAmt}>
                  {item.type === 'fx' ? `${sym}${item.amt?.toLocaleString('ko-KR')}` : `₩${item.amt?.toLocaleString('ko-KR')}`}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  filterRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f0f0' },
  filterBtnActive: { backgroundColor: '#1a3a5c' },
  filterText: { fontSize: 13, color: '#6b6b6b' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  content: { padding: 12, paddingBottom: 32 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: '#9b9b9b', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  rowInfo: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  badge: { backgroundColor: '#e8f4ff', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, color: '#1a3a5c', fontWeight: '600' },
  rowSub: { fontSize: 11, color: '#9b9b9b', marginTop: 2 },
  rowAmts: { alignItems: 'flex-end' },
  rowAmt: { fontSize: 14, fontWeight: '700', color: '#1a3a5c' },
});
