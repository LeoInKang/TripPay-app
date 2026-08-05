import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Platform
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
    trip: initialTrip,
    initialDeposits=[], initialCharges=[], initialExchanges=[],
    initialAtms=[], initialRefunds=[], initialExpenses=[], initialKrwExps=[],
  } = route.params;
  const [activeTab, setActiveTab] = useState('home');

  const [trip,      setTrip]      = useState(initialTrip);

  const [deposits,  setDeposits]  = useState(initialDeposits);
  const [charges,   setCharges]   = useState(initialCharges);
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [atms,      setAtms]      = useState(initialAtms);
  const [refunds,   setRefunds]   = useState(initialRefunds);
  const [expenses,  setExpenses]  = useState(initialExpenses);
  const [krwExps,   setKrwExps]   = useState(initialKrwExps);

  // 현재 화면이 들고 있는 여행 id (자동저장 오염 방지용)
  const loadedTripId = useRef(initialTrip?.id);

  // 다른 여행으로 진입하면(트립 id 변경) 모든 내역 state를 새 params로 재설정.
  // 화면 인스턴스가 재사용되어 useState가 다시 돌지 않는 경우의 오염을 막는다.
  useEffect(() => {
    loadedTripId.current = initialTrip?.id;
    setTrip(initialTrip);
    setDeposits(initialDeposits);
    setCharges(initialCharges);
    setExchanges(initialExchanges);
    setAtms(initialAtms);
    setRefunds(initialRefunds);
    setExpenses(initialExpenses);
    setKrwExps(initialKrwExps);
  }, [initialTrip?.id]);

  // 이 여행을 현재(활성) 여행으로 표시 -> 앱 재시작 시 자동 복원 대상
  useEffect(() => {
    if (trip?.id) setCurrentTripId(trip.id);
  }, [trip?.id]);

  // 데이터 변경 시 자동 저장.
  // 단, 화면 state가 가리키는 여행(trip.id)과 방금 로드한 여행(loadedTripId)이
  // 일치할 때만 저장한다. 여행 전환 직후 옛 state가 새 슬롯에 섞여 저장되는 것을 막는다.
  useEffect(() => {
    if (!trip?.id) return;
    if (trip.id !== loadedTripId.current) return;
    saveTripData(trip.id, {
      trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps,
    });
  }, [trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps]);

  const goHome = () => {
    clearCurrentTripId();
    navigation.navigate('Landing');
  };

  // 여행 설정 저장. retro=false면 기존 '전원 균등' 지출을 이전 멤버로 고정(소급 방지).
  const handleTripSave = (updated, retro = false) => {
    const oldMembers = trip.members || [];
    const newMembers = updated.members || oldMembers;
    const added = newMembers.filter(m => !oldMembers.includes(m));
    if (added.length > 0 && !retro) {
      const freeze = (list) => list.map(e =>
        (e.participants && e.participants.length) ? e : { ...e, participants: [...oldMembers] }
      );
      setExpenses(freeze(expenses));
      setKrwExps(freeze(krwExps));
    }
    setTrip(updated);
  };

  const sharedProps = {
    trip, setTrip,
    openHelp: () => navigation.navigate('Help'),
    deposits, charges, exchanges, atms, refunds, expenses, krwExps,
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
      {/* 상단 헤더: TripPay | 설정 | 히스토리 | 홈 */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.brandText}>
            <Text style={styles.brandTrip}>Trip</Text>
            <Text style={styles.brandPay}>Pay</Text>
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings', { trip, deposits, expenses, krwExps, onSave: handleTripSave })}>
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
        <Text style={styles.tripTitle} numberOfLines={1}>{trip.name}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f0eee8',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },

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
  tripTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
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
    maxHeight: 84,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    gap: 5,
    alignItems: 'center',
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'transparent',
    minWidth: 56,
  },
  tabItemActive: {
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tabIcon: { fontSize: 30, marginBottom: 3 },
  tabLabel: { fontSize: 13, color: '#9b9b9b', fontWeight: '500' },
  tabLabelActive: { color: '#1a1a1a', fontWeight: '700' },

  // 컨텐츠
  content: { flex: 1, backgroundColor: '#f0eee8' },
});
