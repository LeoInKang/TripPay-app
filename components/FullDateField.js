import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

// 연도까지 포함한 날짜(YYYY-MM-DD)를 다루는 달력 입력
export default function FullDateField({ label, value, onChange, placeholder = '날짜 선택' }) {
  const [show, setShow] = useState(false);

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

  // 웹: native input[type=date] (값/반환 모두 YYYY-MM-DD)
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

  const display = value || placeholder;
  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)}>
        <Text style={[styles.value, !value && styles.placeholder]}>📅 {display}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShow(Platform.OS === 'ios');
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
});
