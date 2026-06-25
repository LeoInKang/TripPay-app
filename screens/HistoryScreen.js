import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listTrips, loadTripData, deleteTripData } from '../storage';
import { exportTripFile } from '../transfer';

export default function HistoryScreen({ navigation }) {
  const [trips, setTrips]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const list = await listTrips();
      if (active) { setTrips(list); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  // 화면에 들어올 때마다 목록 새로고침
  useFocusEffect(load);

  const openTrip = async (id) => {
    const data = await loadTripData(id);
    if (!data || !data.trip) return;
    navigation.reset({
      index: 1,
      routes: [
        { name: 'Landing' },
        { name: 'Main', params: {
          trip: data.trip,
          initialDeposits:  data.deposits  || [],
          initialCharges:   data.charges   || [],
          initialExchanges: data.exchanges || [],
          initialAtms:      data.atms      || [],
          initialRefunds:   data.refunds   || [],
          initialExpenses:  data.expenses  || [],
          initialKrwExps:   data.krwExps   || [],
        } },
      ],
    });
  };

  const doDelete = async (id) => {
    await deleteTripData(id);
    setConfirmId(null);
    const list = await listTrips();
    setTrips(list);
  };

  const exportTrip = async (id) => {
    const data = await loadTripData(id);
    if (!data) return;
    try {
      await exportTripFile(data);
    } catch (e) {
      // 내보내기 실패는 조용히 무시 (사용자가 취소했거나 공유 불가)
    }
  };

  const fmtRange = (t) => {
    if (!t.startDate || !t.endDate) return '';
    return `${t.startDate} ~ ${t.endDate}`;
  };
  const fmtUpdated = (ms) => {
    if (!ms) return '';
    try { return new Date(ms).toLocaleString('ko-KR'); } catch (e) { return ''; }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>히스토리</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Text style={styles.empty}>불러오는 중…</Text>
        ) : trips.length === 0 ? (
          <Text style={styles.empty}>저장된 여행이 없어요.</Text>
        ) : (
          trips.map(t => (
            <View key={t.id} style={styles.card}>
              <TouchableOpacity style={styles.cardMain} onPress={() => openTrip(t.id)} activeOpacity={0.7}>
                <Text style={styles.flag}>{t.country?.flag || '🌏'}</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{t.name || '(이름없음)'}</Text>
                  <Text style={styles.cardSub}>
                    {fmtRange(t)}{t.members?.length ? ' · ' + t.members.join(', ') : ''}
                  </Text>
                  {!!fmtUpdated(t.updatedAt) && (
                    <Text style={styles.cardMeta}>최근 수정 {fmtUpdated(t.updatedAt)}</Text>
                  )}
                </View>
              </TouchableOpacity>

              {confirmId === t.id ? (
                <View style={styles.confirmRow}>
                  <TouchableOpacity style={[styles.confirmBtn, styles.confirmYes]} onPress={() => doDelete(t.id)}>
                    <Text style={styles.confirmYesText}>삭제</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, styles.confirmNo]} onPress={() => setConfirmId(null)}>
                    <Text style={styles.confirmNoText}>취소</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actBtn} onPress={() => exportTrip(t.id)}>
                    <Text style={styles.actText}>내보내기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actBtn} onPress={() => setConfirmId(t.id)}>
                    <Text style={styles.delText}>삭제</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f0eee8',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  sideBtn: { minWidth: 56 },
  backText: { fontSize: 14, color: '#1a3a5c', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },

  content: { padding: 12, paddingBottom: 32 },
  empty: { color: '#9b9b9b', fontSize: 14, textAlign: 'center', padding: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  flag: { fontSize: 26, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cardSub: { fontSize: 12, color: '#6b6b6b', marginTop: 2 },
  cardMeta: { fontSize: 10, color: '#9b9b9b', marginTop: 2 },

  actions: { flexDirection: 'column', gap: 4, marginLeft: 8, alignItems: 'flex-end' },
  actBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  actText: { fontSize: 12, color: '#1a3a5c', fontWeight: '600' },
  delText: { fontSize: 12, color: '#c0413f', fontWeight: '600' },

  confirmRow: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  confirmBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  confirmYes: { backgroundColor: '#E24B4A' },
  confirmYesText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { backgroundColor: '#f0f0f0' },
  confirmNoText: { color: '#6b6b6b', fontSize: 12, fontWeight: '600' },
});
