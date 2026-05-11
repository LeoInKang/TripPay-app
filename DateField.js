import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DateField({ label, value, onChange, placeholder = '날짜 선택' }) {
  const [show, setShow] = useState(false);

  // value: "MM-DD" or "" - 현재 연도 기준으로 Date 객체 생성
  const toDate = (v) => {
    if (!v) return new Date();
    const yr = new Date().getFullYear();
    const [m, d] = v.split('-').map(Number);
    return new Date(yr, (m || 1) - 1, d || 1);
  };
  const fromDate = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  };

  const display = value || placeholder;

  // 웹에서는 native input[type=date] 사용
  if (Platform.OS === 'web') {
    return (
      <View>
        {label && <Text style={styles.label}>{label}</Text>}
        <input
          type="date"
          value={value ? `${new Date().getFullYear()}-${value}` : ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return onChange('');
            const parts = v.split('-');
            onChange(`${parts[1]}-${parts[2]}`);
          }}
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