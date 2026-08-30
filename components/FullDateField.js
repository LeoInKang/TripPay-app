import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, Modal, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 연도까지 포함한 날짜(YYYY-MM-DD)를 다루는 달력 입력
export default function FullDateField({ label, value, onChange, placeholder = '날짜 선택' }) {
  // 안드로이드 내비게이션 바(제스처·3버튼)가 하단 버튼을 덮지 않게 실측 여백을 더한다.
  const insets = useSafeAreaInsets();
  const sheetPad = Math.max(24, insets.bottom + 8);
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState(null);

  const toDate = (v) => {
    if (!v) return new Date();
    const [y, m, d] = v.split('-').map(Number);
    return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
  };
  const fromDate = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  const display = value || placeholder;

  // 웹: native input[type=date]
  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value || '')}
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: 'rgba(0,0,0,0.15)',
            padding: 9,
            fontSize: 14,
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
      </View>
    );
  }

  // iOS: 하단 시트 달력
  if (Platform.OS === 'ios') {
    const open = () => { setTemp(toDate(value)); setShow(true); };
    const confirm = () => { if (temp) onChange(fromDate(temp)); setShow(false); };
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity style={styles.field} onPress={open} activeOpacity={0.7}>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>📅 {display}</Text>
        </TouchableOpacity>
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable style={styles.backdrop} onPress={() => setShow(false)}>
            <Pressable style={[styles.sheet, { paddingBottom: sheetPad }]} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.cancelBtn}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label || '날짜 선택'}</Text>
                <TouchableOpacity onPress={confirm}>
                  <Text style={styles.doneBtn}>완료</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp || toDate(value)}
                mode="date"
                display="inline"
                locale="ko-KR"
                onChange={(event, selected) => { if (selected) setTemp(selected); }}
                style={styles.picker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // Android: 기본 팝업 피커
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>📅 {display}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="default"
          locale="ko-KR"
          onChange={(event, selected) => {
            setShow(false);
            if (selected) onChange(fromDate(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600', color: '#6b6b6b', marginBottom: 4 },
  field: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  value: { fontSize: 14, color: '#1a1a1a' },
  placeholder: { color: '#c0c0c0' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  cancelBtn: { fontSize: 15, color: '#9b9b9b' },
  doneBtn: { fontSize: 15, color: '#378ADD', fontWeight: '700' },
  picker: { alignSelf: 'stretch' },
});
