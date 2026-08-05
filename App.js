import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert } from 'react-native';
import SetupScreen   from './screens/SetupScreen';
import MainScreen    from './screens/MainScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import * as Clipboard from 'expo-clipboard';
import { getCurrentTripId, loadTripData } from './storage';
import { importTripFile } from './transfer';
import { RECEIPT_PROMPT } from './receiptPrompt';
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
      initialExpenses:  SAMPLE_EXPENSES,
    });
  };

  // 영수증 사진을 AI에 맡길 때 쓰는 프롬프트 복사
  const copyReceiptPrompt = async () => {
    try {
      await Clipboard.setStringAsync(RECEIPT_PROMPT);
      notify('프롬프트를 복사했어요.\nAI(클로드·챗GPT·제미나이)에 영수증 사진과 함께 붙여넣으세요.\n받은 JSON 파일은 "여행 데이터 가져오기"로 열면 됩니다.');
    } catch (e) {
      notify('복사에 실패했어요. 다시 시도해 주세요.');
    }
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
      <View style={styles.background}>
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
          <TouchableOpacity style={styles.btnSecondary} onPress={handleImport}>
            <Text style={styles.btnSecondaryText}>📂 여행 데이터 가져오기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('History')}>
            <Text style={styles.btnSecondaryText}>📋 히스토리</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={copyReceiptPrompt} hitSlop={8}>
            <Text style={styles.promptLink}>📷 영수증을 AI로 입력하기 — 프롬프트 복사</Text>
          </TouchableOpacity>
          {/* 개발용: 출시 빌드(__DEV__ === false)에서는 자동으로 숨겨짐 */}
          {__DEV__ && (
            <TouchableOpacity style={styles.btnDev} onPress={loadSample}>
              <Text style={styles.btnDevText}>🧪 샘플 데이터 로드 (개발용)</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.version}>TripPay v1.1</Text>
      </View>
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

  const resumeParams = resume ? {
    trip: resume.trip,
    initialDeposits:  resume.deposits  || [],
    initialCharges:   resume.charges   || [],
    initialExchanges: resume.exchanges || [],
    initialAtms:      resume.atms      || [],
    initialRefunds:   resume.refunds   || [],
    initialExpenses:  resume.expenses  || [],
    initialKrwExps:   resume.krwExps   || [],
  } : undefined;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={resume ? 'Main' : 'Landing'}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Setup"   component={SetupScreen} />
        <Stack.Screen name="Main"    component={MainScreen} initialParams={resumeParams} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a5c' },
  boot: { flex: 1, backgroundColor: '#1a3a5c', alignItems: 'center', justifyContent: 'center' },
  background: { flex: 1, backgroundColor: '#1a3a5c', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 60, paddingHorizontal: 24 },
  heroSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  planeEmoji: { fontSize: 80, marginBottom: 16 },
  logoText: { fontSize: 48, fontWeight: '800', marginBottom: 16 },
  logoTrip: { color: '#ffffff', fontSize: 48, fontWeight: '800' },
  logoPay: { color: '#64b4ff', fontSize: 48, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.75)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  buttonSection: { width: '100%', gap: 12 },
  btnPrimary: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText: { color: '#1a3a5c', fontSize: 16, fontWeight: '700' },
  btnSecondary: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnSecondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '500' },
  btnDev: { backgroundColor: 'rgba(255,200,0,0.2)', borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,200,0,0.4)' },
  btnDevText: { color: '#ffd700', fontSize: 13, fontWeight: '600' },
  promptLink: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500', textAlign: 'center', paddingVertical: 4 },
  version: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 },
});
