import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import SetupScreen   from './screens/SetupScreen';
import MainScreen    from './screens/MainScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import ImportAIScreen from './screens/ImportAIScreen';
import { getCurrentTripId, loadTripData } from './storage';
import { importTripFile } from './transfer';
import {
  SAMPLE_TRIP, SAMPLE_DEPOSITS, SAMPLE_CHARGES,
  SAMPLE_EXCHANGES, SAMPLE_EXPENSES
} from './sampleData';

const Stack = createNativeStackNavigator();

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

function LandingScreen({ navigation }) {
  // 개발용 샘플 데이터 바로 로드
  const loadSample = () => {
    navigation.navigate('Main', {
      trip: SAMPLE_TRIP,
      initialDeposits:  SAMPLE_DEPOSITS,
      initialCharges:   SAMPLE_CHARGES,
      initialExchanges: SAMPLE_EXCHANGES,
      initialAtms:      [],
      initialRefunds:   [],
      initialExpenses:  SAMPLE_EXPENSES,
      initialKrwExps:   [],
    });
  };

  // JSON 파일에서 여행 데이터 가져오기
  const handleImport = async () => {
    try {
      const data = await importTripFile();
      if (!data) return; // 취소
      if (!data.trip.id) data.trip.id = 'trip_' + Date.now();
      navigation.navigate('Main', {
        trip: data.trip,
        initialDeposits:  data.deposits,
        initialCharges:   data.charges,
        initialExchanges: data.exchanges,
        initialAtms:      data.atms,
        initialRefunds:   data.refunds,
        initialExpenses:  data.expenses,
        initialKrwExps:   data.krwExps,
      });
    } catch (e) {
      notify('가져오기에 실패했어요. 올바른 TripPay JSON 파일인지 확인해 주세요.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* 화면이 짧으면(360x640 같은 소형 안드로이드) 로고 영역이 넘쳐 버튼에 깔린다.
          RN은 넘친 내용을 자르지 않으므로 ScrollView로 받아낸다.
          flexGrow:1 이라 화면이 넉넉하면 종전과 똑같이 위아래로 벌어진다. */}
      <ScrollView
        style={styles.background}
        contentContainerStyle={styles.backgroundContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroSection}>
          <Text style={styles.planeEmoji}>✈️</Text>
          <Text style={styles.logoText}>
            <Text style={styles.logoTrip}>Trip</Text>
            <Text style={styles.logoPay}>Pay</Text>
          </Text>
          <Text style={styles.tagline}>회비 납부부터 지출·정산까지{'\n'}단체 여행 공금 관리 한 번에</Text>
        </View>
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('Setup')}>
            <Text style={styles.btnPrimaryText}>✈ 새로운 여행 시작</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('ImportAI')}>
            <Text style={styles.btnSecondaryText}>🧾 AI로 영수증 입력</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleImport}>
            <Text style={styles.btnSecondaryText}>📂 여행 데이터 가져오기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('History')}>
            <Text style={styles.btnSecondaryText}>📋 히스토리</Text>
          </TouchableOpacity>
          {/* 개발용: 출시 빌드(__DEV__ === false)에서는 자동으로 숨겨짐 */}
          {__DEV__ && (
            <TouchableOpacity style={styles.btnDev} onPress={loadSample}>
              <Text style={styles.btnDevText}>🧪 샘플 데이터 로드 (개발용)</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.version}>TripPay v1.2.5</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [resume,  setResume]  = useState(null);

  // 앱 시작 시 마지막 여행 자동 복원
  useEffect(() => {
    (async () => {
      try {
        const id = await getCurrentTripId();
        if (id) {
          const data = await loadTripData(id);
          if (data && data.trip) setResume(data);
        }
      } catch (e) {}
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#64b4ff" />
      </View>
    );
  }

  // 복원한 여행은 처음 띄우는 라우트 하나에만 실어 보낸다.
  // initialParams 로 주면 안 된다 — Main 으로 들어올 때마다 병합돼서,
  // 새 여행 시작처럼 trip 만 넘기는 진입에 옛 여행의 내역이 그대로 딸려 들어간다.
  const initialState = resume ? {
    index: 0,
    routes: [{
      name: 'Main',
      params: {
        trip: resume.trip,
        initialDeposits:  resume.deposits  || [],
        initialCharges:   resume.charges   || [],
        initialExchanges: resume.exchanges || [],
        initialAtms:      resume.atms      || [],
        initialRefunds:   resume.refunds   || [],
        initialExpenses:  resume.expenses  || [],
        initialKrwExps:   resume.krwExps   || [],
      },
    }],
  } : undefined;

  return (
    <SafeAreaProvider>
    <NavigationContainer initialState={initialState}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Landing">
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Setup"   component={SetupScreen} />
        <Stack.Screen name="Main"    component={MainScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="ImportAI" component={ImportAIScreen} />
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a5c' },
  boot: { flex: 1, backgroundColor: '#1a3a5c', alignItems: 'center', justifyContent: 'center' },
  background: { flex: 1, backgroundColor: '#1a3a5c' },
  backgroundContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60, paddingHorizontal: 24 },
  heroSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  planeEmoji: { fontSize: 80, marginBottom: 16 },
  logoText: { fontSize: 48, fontWeight: '800', marginBottom: 16 },
  logoTrip: { color: '#ffffff', fontSize: 48, fontWeight: '800' },
  logoPay: { color: '#64b4ff', fontSize: 48, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center' },
  buttonSection: { width: '100%', gap: 12 },
  btnPrimary: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText: { color: '#1a3a5c', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnSecondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  btnDev: { backgroundColor: 'rgba(255,200,0,0.2)', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,200,0,0.4)' },
  btnDevText: { color: '#ffd700', fontSize: 13, fontWeight: '600' },
  version: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 },
});
