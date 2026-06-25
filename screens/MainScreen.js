import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView
} from 'react-native';
import HomeTab    from './tabs/HomeTab';
import DepositTab from './tabs/DepositTab';
import ChargeTab  from './tabs/ChargeTab';
import AddTab     from './tabs/AddTab';
import ListTab    from './tabs/ListTab';
import SettleTab  from './tabs/SettleTab';
import { saveTripData, setCurrentTripId, clearCurrentTripId } from '../storage';

const TABS = [
  { id: 'home',    icon: '🏠', label: '현황' },
  { id: 'deposit', icon: '💰', label: '회비' },
  { id: 'charge',  icon: '💳', label: '충전/환전' },
  { id: 'add',     icon: '➕', label: '지출' },
  { id: 'list',    icon: '📋', label: '내역' },
  { id: 'settle',  icon: '🧾', label: '정산' },
];

export default function MainScreen({ route, navigation }) {
  const {
    trip,
    initialDeposits=[], initialCharges=[], initialExchanges=[],
    initialAtms=[], initialRefunds=[], initialExpenses=[], initialKrwExps=[],
  } = route.params;
  const [activeTab, setActiveTab] = useState('home');

  const [deposits,  setDeposits]  = useState(initialDeposits);
  const [charges,   setCharges]   = useState(initialCharges);
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [atms,      setAtms]      = useState(initialAtms);
  const [refunds,   setRefunds]   = useState(initialRefunds);
  const [expenses,  setExpenses]  = useState(initialExpenses);
  const [krwExps,   setKrwExps]   = useState(initialKrwExps);

  // 이 여행을 현재(활성) 여행으로 표시 -> 앱 재시작 시 자동 복원 대상
  useEffect(() => {
    if (trip?.id) setCurrentTripId(trip.id);
  }, [trip?.id]);

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    if (!trip?.id) return;
    saveTripData(trip.id, {
      trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps,
    });
  }, [trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps]);

  const goHome = () => {
    clearCurrentTripId();
    navigation.navigate('Landing');
  };

  const sharedProps = {
    trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps,
    setDeposits, setCharges, setExchanges, setAtms, setRefunds,
    setExpenses, setKrwExps,
  };

  // 날짜 표시: 2026년 5/5 – 5/8 · 3박4일
  const formatDateRange = () => {
    const sd = trip.startDate, ed = trip.endDate;
    if (!sd || !ed) return '';
    const yr = sd.slice(0, 4);
    const sm = parseInt(sd.slice(5,7)) + '/' + parseInt(sd.slice(8,10));
    const em = parseInt(ed.slice(5,7)) + '/' + parseInt(ed.slice(8,10));
    const nights = Math.round((new Date(ed) - new Date(sd)) / 86400000);
    return `${yr}년 ${sm} – ${em} · ${nights}박${nights+1}일`;
  };

  const renderTab = () => {
    switch(activeTab) {
      case 'home':    return <HomeTab    {...sharedProps} />;
      case 'deposit': return <DepositTab {...sharedProps} />;
      case 'charge':  return <ChargeTab  {...sharedProps} />;
      case 'add':     return <AddTab     {...sharedProps} />;
      case 'list':    return <ListTab    {...sharedProps} />;
      case 'settle':  return <SettleTab  {...sharedProps} />;
      default:        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 헤더: TripPay · 여행명 | 설정 | 히스토리 | 홈 */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.brandText}>
            <Text style={styles.brandTrip}>Trip</Text>
            <Text style={styles.brandPay}>Pay</Text>
          </Text>
          <Text style={styles.brandDot}> · </Text>
          <Text style={styles.tripTitle}>{trip.name}</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>⚙ 설정</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('History')}>
            <Text style={styles.iconBtnText}>📋 히스토리</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={goHome}
          >
            <Text style={styles.iconBtnText}>🏠 홈</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 정보 라인 */}
      <View style={styles.infoBar}>
        <Text style={styles.infoLine1}>
          {formatDateRange()}{trip.note ? ' · ' + trip.note : ''}
        </Text>
        <Text style={styles.infoLine2}>
          참석: {trip.members.join(', ')}
        </Text>
      </View>

      {/* 상단 탭바 (가로 스크롤 가능) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabItem, activeTab === t.id && styles.tabItemActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 탭 컨텐츠 */}
      <View style={styles.content}>{renderTab()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eee8' },

  // 상단 헤더 (TripPay 브랜드 + 설정/히스토리/홈)
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0eee8',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  topBarRight: { flexDirection: 'row', gap: 6 },
  brandText: { fontSize: 18, fontWeight: '800' },
  brandTrip: { color: '#1a3a5c' },
  brandPay:  { color: '#378ADD' },
  brandDot:  { color: '#9b9b9b', fontSize: 14 },
  tripTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flexShrink: 1 },
  iconBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  iconBtnText: { fontSize: 11, color: '#1a1a1a', fontWeight: '500' },

  // 정보 라인 (날짜 · 메모 / 참석자)
  infoBar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#f0eee8',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  infoLine1: { fontSize: 13, color: '#6b6b6b', marginBottom: 3 },
  infoLine2: { fontSize: 13, color: '#6b6b6b' },

  // 상단 탭바
  tabBarScroll: {
    backgroundColor: '#f0eee8',
    maxHeight: 64,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
    minWidth: 64,
  },
  tabItemActive: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 11, color: '#9b9b9b', fontWeight: '500' },
  tabLabelActive: { color: '#1a1a1a', fontWeight: '700' },

  // 컨텐츠
  content: { flex: 1, backgroundColor: '#f0eee8' },
});
