import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView, Platform, Alert, StatusBar
} from 'react-native';
import DateField from '../components/FullDateField';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function SettingsScreen({ route, navigation }) {
  const { trip, onSave, deposits = [], expenses = [], krwExps = [] } = route.params || {};

  const [tripName,  setTripName]  = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip?.startDate || '');
  const [endDate,   setEndDate]   = useState(trip?.endDate || '');
  const [note,      setNote]      = useState(trip?.note || '');
  const [members,   setMembers]   = useState(trip?.members || []);
  const [newMember, setNewMember] = useState('');

  // 삭제 가능 여부: 회비 또는 지출(참여자·분담값)에 참조된 멤버는 삭제 불가
  const memberHasData = (m) => {
    if (deposits.some(d => d.mem === m)) return true;
    const inExp = (list) => list.some(e =>
      (e.participants && e.participants.includes(m)) ||
      (e.split && e.split.values && e.split.values[m] != null)
    );
    return inExp(expenses) || inExp(krwExps);
  };

  const addMember = () => {
    const name = newMember.trim();
    if (!name) return;
    if (members.includes(name)) { notify('이미 있는 참석자예요.'); return; }
    setMembers([...members, name]);
    setNewMember('');
  };
  const removeMember = (m) => {
    if (members.length <= 1) { notify('참석자는 최소 1명이 필요해요.'); return; }
    if (memberHasData(m)) { notify(`${m}님은 회비·지출 내역이 있어 삭제할 수 없어요. 내역을 먼저 정리해 주세요.`); return; }
    setMembers(members.filter(x => x !== m));
  };

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

  const handleSave = () => {
    if (!tripName.trim()) {
      notify('여행명을 입력해 주세요.');
      return;
    }
    if (!members.length) { notify('참석자를 최소 1명 입력해 주세요.'); return; }
    const updated = {
      ...trip,
      name: tripName.trim(),
      startDate,
      endDate,
      note,
      members,
    };
    const oldMembers = trip?.members || [];
    const added = members.filter(m => !oldMembers.includes(m));

    const finish = (retro) => {
      if (onSave) onSave(updated, retro);
      navigation.goBack();
    };

    if (added.length === 0) { finish(false); return; }

    const msg = `새 참석자(${added.join(', ')})를 기존 '전원 균등' 지출에도 소급 적용할까요?\n(개별 지출은 내역에서 따로 조정할 수 있어요)`;
    if (Platform.OS === 'web') {
      finish(typeof window !== 'undefined'
        ? window.confirm(msg + '\n\n확인 = 소급 적용 / 취소 = 이후 지출부터')
        : false);
    } else {
      Alert.alert('참석자 추가', msg, [
        { text: '이후 지출부터', onPress: () => finish(false) },
        { text: '소급 적용', onPress: () => finish(true) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.sideBtn}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>여행 설정</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>여행명</Text>
          <TextInput
            style={styles.input}
            placeholder="여행명"
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <DateField label="시작일" value={startDate} onChange={handleStartDate} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <DateField label="종료일" value={endDate} onChange={setEndDate} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="메모"
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* 참석자 편집 */}
        <View style={styles.field}>
          <Text style={styles.label}>참석자</Text>
          {members.map(m => (
            <View key={m} style={styles.memberRow}>
              <Text style={styles.memberName}>{m}</Text>
              <TouchableOpacity onPress={() => removeMember(m)} style={styles.memberDel} hitSlop={8}>
                <Text style={styles.memberDelText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="참석자 추가"
              value={newMember}
              onChangeText={setNewMember}
              onSubmitEditing={addMember}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addMember} activeOpacity={0.85}>
              <Text style={styles.addBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoHint}>
            여행 중 추가한 참석자는 이후 지출부터 반영돼요. 회비·지출 내역이 있는 참석자는 삭제할 수 없어요.
          </Text>
        </View>

        {/* 국가/통화 (변경 불가) */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>국가 · 통화</Text>
          <Text style={styles.infoValue}>
            {trip?.country?.flag || '🌏'} {trip?.country?.name || ''} ({trip?.country?.code || ''})
          </Text>
          <Text style={styles.infoHint}>국가·통화는 정산에 영향이 커서 바꿀 수 없어요.</Text>
        </View>

        <TouchableOpacity style={styles.btnSave} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnSaveText}>저장</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },

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

  scroll: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 16 },
  row: { flexDirection: 'row' },
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

  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 11, color: '#9b9b9b', marginBottom: 4 },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  infoHint: { fontSize: 11, color: '#9b9b9b', marginTop: 6, lineHeight: 16 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  memberName: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  memberDel: { paddingHorizontal: 6, paddingVertical: 2 },
  memberDelText: { fontSize: 15, color: '#c0413f', fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  addBtn: { backgroundColor: '#1a3a5c', borderRadius: 10, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  btnSave: {
    backgroundColor: '#1a3a5c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
