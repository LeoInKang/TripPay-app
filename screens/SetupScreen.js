import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView,
  Platform, StatusBar
} from 'react-native';
import KeyboardAvoider from '../components/KeyboardAvoider';
import FullDateField from '../components/FullDateField';
import CountryPicker from '../components/CountryPicker';
import ReorderList from '../components/ReorderList';
import { currencyLabel } from '../currency';

export default function SetupScreen({ navigation }) {
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [members, setMembers] = useState('');
  // 거쳐 가는 나라를 한 번에 고른다. 첫 번째가 정산 기준 통화가 된다.
  const [countries, setCountries] = useState([]);
  const [picking, setPicking] = useState(false);
  // 순서를 끄는 동안에는 화면 스크롤을 잠근다 (설정 화면과 같은 이유)
  const [dragging, setDragging] = useState(false);
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
    if (!tripName || !countries.length || !members) {
      alert('여행명, 국가, 참석자를 입력해 주세요.');
      return;
    }
    const trip = {
      id: 'trip_' + Date.now(),
      name: tripName,
      startDate,
      endDate,
      country: countries[0],           // 구버전 화면 호환 (대표 국가)
      countries,                       // 거쳐 간 나라 — 통화가 겹쳐도 그대로 둔다
      homeCode: countries[0].code,     // 정산 기준 통화. 목록 순서와 분리돼 있다

      members: members.split(/[,\s]+/).map(m => m.trim()).filter(Boolean),
      note,
    };
    // 새 여행은 빈 상태다. 여덟 칸을 모두 명시해서 넘긴다 —
    // 빠뜨린 칸은 화면 기본값이 아니라 직전 여행의 값으로 채워질 수 있다.
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: {
        trip,
        initialDeposits:  [],
        initialCharges:   [],
        initialExchanges: [],
        initialAtms:      [],
        initialRefunds:   [],
        initialExpenses:  [],
        initialKrwExps:   [],
      } }],
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
          scrollEnabled={!dragging}
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

          {/* 국가 선택 — 여러 나라를 한 번에 고른다 */}
          <View style={styles.field}>
            <Text style={styles.label}>여행 국가 (여러 곳이면 다 고르세요)</Text>

            {countries.length > 0 && (
            <View style={styles.curBox}>
            <ReorderList
              data={countries}
              onChange={setCountries}
              onDragging={setDragging}
              rowHeight={46}
              renderRow={(c, i) => (
                <>
                  <Text style={styles.curName}>{c.flag || '🌏'} {c.name}</Text>
                  <Text style={styles.curCode}>{currencyLabel(c.code, c.sym)}</Text>
                  <TouchableOpacity onPress={() => setCountries(countries.filter((_, j) => j !== i))} hitSlop={10}>
                    <Text style={styles.curDel}>✕</Text>
                  </TouchableOpacity>
                </>
              )}
            />
            </View>
            )}

            <TouchableOpacity style={styles.btnAddCur} onPress={() => setPicking(true)} activeOpacity={0.8}>
              <Text style={styles.btnAddCurText}>
                {countries.length ? '+ 국가 더 고르기' : '+ 국가 선택'}
              </Text>
            </TouchableOpacity>

            {picking && (
              <CountryPicker
                multi
                openNow
                value={countries}
                onChange={setCountries}
                onClose={() => setPicking(false)}
                title="여행 국가 선택 (여러 개 가능)"
              />
            )}

            {countries.length > 1 && (
              <Text style={styles.hint}>
                왼쪽 손잡이를 끌어 순서를 바꿀 수 있어요. 통화가 같은 나라는 하나로 묶여요.{'\n'}
                {countries[0].code}가 정산 기준입니다.
              </Text>
            )}
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
  hint: { fontSize: 11, color: '#9b9b9b', marginTop: 8, lineHeight: 16 },

  // overflow:hidden 을 주면 끌어올린 행이 상자 밖에서 잘린다
  curBox: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', marginBottom: 8,
  },
  curName: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', flex: 1 },
  curCode: { fontSize: 12, color: '#9b9b9b', marginRight: 10 },
  curDel: { fontSize: 14, color: '#E24B4A', paddingHorizontal: 6 },
  btnAddCur: {
    paddingVertical: 10, borderRadius: 10,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.15)', alignItems: 'center', backgroundColor: '#fafafa',
  },
  btnAddCurText: { fontSize: 13, color: '#1a3a5c', fontWeight: '600' },
  curCancel: { fontSize: 12, color: '#9b9b9b', marginTop: 6, textAlign: 'center' },
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
