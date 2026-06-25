import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, SafeAreaView, Platform, Alert
} from 'react-native';
import DateField from '../components/DateField';

function notify(msg) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg);
  } else {
    Alert.alert('알림', msg);
  }
}

export default function SettingsScreen({ route, navigation }) {
  const { trip, onSave } = route.params || {};

  const [tripName,  setTripName]  = useState(trip?.name || '');
  const [startDate, setStartDate] = useState(trip?.startDate || '');
  const [endDate,   setEndDate]   = useState(trip?.endDate || '');
  const [note,      setNote]      = useState(trip?.note || '');

  const handleSave = () => {
    if (!tripName.trim()) {
      notify('여행명을 입력해 주세요.');
      return;
    }
    const updated = {
      ...trip,
      name: tripName.trim(),
      startDate,
      endDate,
      note,
    };
    if (onSave) onSave(updated);
    navigation.goBack();
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
            placeholder="예) 일본 골프투어"
            value={tripName}
            onChangeText={setTripName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <DateField label="시작일" value={startDate} onChange={setStartDate} />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <DateField label="종료일" value={endDate} onChange={setEndDate} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>메모 (선택)</Text>
          <TextInput
            style={styles.input}
            placeholder="야마구치현 골프"
            value={note}
            onChangeText={setNote}
          />
        </View>

        {/* 변경 불가 항목 안내 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>참석자 · 국가/통화</Text>
          <Text style={styles.infoValue}>
            {trip?.country?.flag || '🌏'} {trip?.country?.name || ''} ({trip?.country?.code || ''}) · {(trip?.members || []).join(', ')}
          </Text>
          <Text style={styles.infoHint}>
            참석자와 국가/통화는 정산 결과에 영향이 커서 여기서는 바꿀 수 없어요.
          </Text>
        </View>

        <TouchableOpacity style={styles.btnSave} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.btnSaveText}>저장</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },

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

  btnSave: {
    backgroundColor: '#1a3a5c',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
