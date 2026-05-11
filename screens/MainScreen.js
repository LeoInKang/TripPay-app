import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import HomeTab    from './tabs/HomeTab';
import DepositTab from './tabs/DepositTab';
import ChargeTab  from './tabs/ChargeTab';
import AddTab     from './tabs/AddTab';
import ListTab    from './tabs/ListTab';
import SettleTab  from './tabs/SettleTab';

const TABS = [
  { id: 'home',    icon: '🏠', label: '현황' },
  { id: 'deposit', icon: '💰', label: '회비' },
  { id: 'charge',  icon: '💳', label: '충전/환전' },
  { id: 'add',     icon: '📝', label: '지출' },
  { id: 'list',    icon: '📋', label: '내역' },
  { id: 'settle',  icon: '📊', label: '정산' },
];

export default function MainScreen({ route }) {
  const { trip, initialDeposits=[], initialCharges=[], initialExchanges=[], initialExpenses=[] } = route.params;
  const [activeTab, setActiveTab] = useState('home');

  const [deposits,  setDeposits]  = useState(initialDeposits);
  const [charges,   setCharges]   = useState(initialCharges);
  const [exchanges, setExchanges] = useState(initialExchanges);
  const [atms,      setAtms]      = useState([]);
  const [refunds,   setRefunds]   = useState([]);
  const [expenses,  setExpenses]  = useState(initialExpenses);
  const [krwExps,   setKrwExps]   = useState([]);

  const sharedProps = {
    trip, deposits, charges, exchanges, atms, refunds, expenses, krwExps,
    setDeposits, setCharges, setExchanges, setAtms, setRefunds,
    setExpenses, setKrwExps,
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{trip.country.flag} {trip.name}</Text>
        <Text style={styles.headerSub}>{trip.members.join(' · ')} · {trip.startDate} ~ {trip.endDate}</Text>
      </View>
      <View style={styles.content}>{renderTab()}</View>
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={styles.tabItem} onPress={() => setActiveTab(t.id)}>
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            {activeTab === t.id && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: { backgroundColor: '#1a3a5c', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  content: { flex: 1 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: 'rgba(0,0,0,0.1)', paddingBottom: 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 8, position: 'relative' },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 9, color: '#9b9b9b', marginTop: 1 },
  tabLabelActive: { color: '#1a3a5c', fontWeight: '700' },
  tabIndicator: { position: 'absolute', top: 0, width: 24, height: 2, backgroundColor: '#1a3a5c', borderRadius: 1 },
});
