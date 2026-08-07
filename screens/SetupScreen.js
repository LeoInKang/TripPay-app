import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView,
  Platform, StatusBar
} from 'react-native';
import KeyboardAvoider from '../components/KeyboardAvoider';
import FullDateField from '../components/FullDateField';
import CountryPicker from '../components/CountryPicker';

export default function SetupScreen({ navigation }) {
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [members, setMembers] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [note, setNote] = useState('');

  // 시작일 선택 시 종료일이 비어 있으면 다음날로 자동 설정
  const nextDay = (ymd) => {
    if (!ymd) return '';
    const d = new Date(ymd + 'T00:00:00');
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const handleStartDate = (v) => {
    setStartDate(v);
    if (!endDate) setEndDate(nextDay(v));
  };

  const handleStart = () => {
    if (!tripName || !selectedCountry || !members) {
      alert('여행명, 국가, 참석자를 입력해 주세요.');
      return;
    }
    const trip = {
      id: 'trip_' + Date.now(),
      name: tripName,
      startDate,
      endDate,
      country: selectedCountry,
      members: members.split(/[,\s]+/).map(m => m.trim()).filter(Boolean),
      note,
    };
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { trip } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 뒤로·제목은 스크롤 영역 밖에 둔다 — 안에 있으면 키보드가 뜰 때 함께 밀려 올라가 눌리지 않는다 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>새 여행 시작</Text>
      </View>

      <KeyboardAvoider style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >

          {/* 여행명 */}
          <View style={styles.field}>
            <Text style={styles.label}>여행명</Text>
            <TextInput
              style={styles.input}
              placeholder="여행명"
              value={tripName}
              onChangeText={setTripName}
              returnKeyType="done"
            />
          </View>

          {/* 날짜 */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
              <FullDateField label="시작일" value={startDate} onChange={handleStartDate} />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <FullDateField label="종료일" value={endDate} onChange={setEndDate} />
            </View>
          </View>

          {/* 국가 선택 */}
          <View style={styles.field}>
            <CountryPicker value={selectedCountry} onChange={setSelectedCountry} />
          </View>

          {/* 참석자 */}
          <View style={styles.field}>
            <Text style={styles.label}>참석자 (쉼표 또는 띄어쓰기로 구분)</Text>
            <TextInput
              style={styles.input}
              placeholder="홍길동, 김철수, 이영희"
              value={members}
              onChangeText={setMembers}
              returnKeyType="done"
            />
          </View>

          {/* 메모 */}
          <View style={styles.field}>
            <Text style={styles.label}>메모 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="메모"
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
          </View>

          {/* 시작 버튼 */}
          <TouchableOpacity style={styles.btnStart} onPress={handleStart}>
            <Text style={styles.btnStartText}>✈ 여행 시작</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 120 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a3a5c', marginBottom: 8 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: '#1a3a5c', fontWeight: '600' },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 0 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b6b6b', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    padding: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  btnStart: {
    backgroundColor: '#1a3a5c',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnStartText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
