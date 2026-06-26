import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView
} from 'react-native';
import FullDateField from '../components/FullDateField';

const COUNTRIES = [
  { flag:'🇯🇵', name:'일본', code:'JPY', sym:'¥', r100:true,  exRate:'930' },
  { flag:'🇺🇸', name:'미국', code:'USD', sym:'$', r100:false, exRate:'1350' },
  { flag:'🇹🇭', name:'태국', code:'THB', sym:'฿', r100:false, exRate:'40' },
  { flag:'🇻🇳', name:'베트남', code:'VND', sym:'₫', r100:false, exRate:'0.055' },
  { flag:'🇪🇺', name:'유럽', code:'EUR', sym:'€', r100:false, exRate:'1500' },
  { flag:'🇬🇧', name:'영국', code:'GBP', sym:'£', r100:false, exRate:'1750' },
  { flag:'🇦🇺', name:'호주', code:'AUD', sym:'A$', r100:false, exRate:'900' },
  { flag:'🇨🇳', name:'중국', code:'CNY', sym:'¥', r100:false, exRate:'195' },
  { flag:'🇵🇭', name:'필리핀', code:'PHP', sym:'₱', r100:false, exRate:'24' },
  { flag:'🇸🇬', name:'싱가포르', code:'SGD', sym:'S$', r100:false, exRate:'1020' },
  { flag:'🇨🇦', name:'캐나다', code:'CAD', sym:'C$', r100:false, exRate:'980' },
];

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
      members: members.split(',').map(m => m.trim()).filter(Boolean),
      note,
    };
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { trip } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>새 여행 시작</Text>

        {/* 여행명 */}
        <View style={styles.field}>
          <Text style={styles.label}>여행명</Text>
          <TextInput
            style={styles.input}
            placeholder="여행명"
            value={tripName}
            onChangeText={setTripName}
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
          <Text style={styles.label}>여행 국가</Text>
          <View style={styles.countryGrid}>
            {COUNTRIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.countryBtn, selectedCountry?.code === c.code && styles.countryBtnSelected]}
                onPress={() => setSelectedCountry(c)}
              >
                <Text style={styles.countryFlag}>{c.flag}</Text>
                <Text style={[styles.countryName, selectedCountry?.code === c.code && styles.countryNameSelected]}>
                  {c.name}
                </Text>
                <Text style={[styles.countryCur, selectedCountry?.code === c.code && styles.countryCurSelected]}>
                  {c.code} {c.sym}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 참석자 */}
        <View style={styles.field}>
          <Text style={styles.label}>참석자 (쉼표로 구분)</Text>
          <TextInput
            style={styles.input}
            placeholder="홍길동, 김철수, 이영희"
            value={members}
            onChangeText={setMembers}
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
          />
        </View>

        {/* 시작 버튼 */}
        <TouchableOpacity style={styles.btnStart} onPress={handleStart}>
          <Text style={styles.btnStartText}>✈ 여행 시작</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a3a5c', marginBottom: 24 },
  backBtn: { marginBottom: 12 },
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
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countryBtn: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    padding: 10,
    alignItems: 'center',
  },
  countryBtnSelected: {
    backgroundColor: '#e6f1fb',
    borderColor: '#2563a8',
    borderWidth: 1.5,
  },
  countryFlag: { fontSize: 24, marginBottom: 2 },
  countryName: { fontSize: 12, fontWeight: '600', color: '#1a1a1a' },
  countryNameSelected: { color: '#0c447c' },
  countryCur: { fontSize: 10, color: '#9b9b9b', marginTop: 1 },
  countryCurSelected: { color: '#2563a8' },
  btnStart: {
    backgroundColor: '#1a3a5c',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  btnStartText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
